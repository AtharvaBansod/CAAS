// CaaS Rust Backend SDK — Hardened
// SDKBE-REL-001: Typed Error Hierarchy, Retry/Backoff, Circuit Breaker

use std::collections::HashMap;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::thread;

// ═══ Error Hierarchy ═══

#[derive(Debug, Clone, PartialEq)]
pub enum SdkErrorCode {
    NetworkError,
    TimeoutError,
    AuthError,
    ValidationError,
    ThrottleError,
    ServerError,
    CircuitOpen,
    UnknownError,
}

impl std::fmt::Display for SdkErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SdkErrorCode::NetworkError => write!(f, "NETWORK_ERROR"),
            SdkErrorCode::TimeoutError => write!(f, "TIMEOUT_ERROR"),
            SdkErrorCode::AuthError => write!(f, "AUTH_ERROR"),
            SdkErrorCode::ValidationError => write!(f, "VALIDATION_ERROR"),
            SdkErrorCode::ThrottleError => write!(f, "THROTTLE_ERROR"),
            SdkErrorCode::ServerError => write!(f, "SERVER_ERROR"),
            SdkErrorCode::CircuitOpen => write!(f, "CIRCUIT_OPEN"),
            SdkErrorCode::UnknownError => write!(f, "UNKNOWN_ERROR"),
        }
    }
}

#[derive(Debug)]
pub struct SdkError {
    pub message: String,
    pub code: SdkErrorCode,
    pub status: Option<u16>,
    pub retryable: bool,
    pub retry_after_secs: Option<u64>,
}

impl std::fmt::Display for SdkError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for SdkError {}

impl SdkError {
    pub fn network(msg: &str) -> Self {
        SdkError { message: msg.to_string(), code: SdkErrorCode::NetworkError, status: None, retryable: true, retry_after_secs: None }
    }
    pub fn timeout(msg: &str) -> Self {
        SdkError { message: msg.to_string(), code: SdkErrorCode::TimeoutError, status: None, retryable: true, retry_after_secs: None }
    }
    pub fn auth(msg: &str, status: u16) -> Self {
        SdkError { message: msg.to_string(), code: SdkErrorCode::AuthError, status: Some(status), retryable: false, retry_after_secs: None }
    }
    pub fn validation(msg: &str, status: u16) -> Self {
        SdkError { message: msg.to_string(), code: SdkErrorCode::ValidationError, status: Some(status), retryable: false, retry_after_secs: None }
    }
    pub fn throttle(msg: &str, retry_after: Option<u64>) -> Self {
        SdkError { message: msg.to_string(), code: SdkErrorCode::ThrottleError, status: Some(429), retryable: true, retry_after_secs: retry_after }
    }
    pub fn server(msg: &str, status: u16) -> Self {
        SdkError { message: msg.to_string(), code: SdkErrorCode::ServerError, status: Some(status), retryable: true, retry_after_secs: None }
    }
    pub fn circuit_open() -> Self {
        SdkError { message: "Circuit breaker is open".to_string(), code: SdkErrorCode::CircuitOpen, status: None, retryable: false, retry_after_secs: None }
    }
}

fn classify_http_error(status: u16, _body: &str, retry_after: Option<&str>) -> SdkError {
    match status {
        401 | 403 => SdkError::auth(&format!("Auth failed ({})", status), status),
        400 | 422 => SdkError::validation(&format!("Validation error ({})", status), status),
        429 => {
            let ra = retry_after.and_then(|v| v.parse::<u64>().ok());
            SdkError::throttle("Rate limited (429)", ra)
        }
        s if s >= 500 => SdkError::server(&format!("Server error ({})", status), status),
        _ => SdkError { message: format!("Request failed ({})", status), code: SdkErrorCode::UnknownError, status: Some(status), retryable: false, retry_after_secs: None },
    }
}

// ═══ Circuit Breaker ═══

#[derive(Debug, Clone, PartialEq)]
pub enum CircuitState { Closed, Open, HalfOpen }

pub struct CircuitBreaker {
    state: CircuitState,
    failures: u32,
    last_failure: Instant,
    threshold: u32,
    pub reset_duration: Duration,
}

impl CircuitBreaker {
    pub fn new(threshold: u32, reset_secs: u64) -> Self {
        CircuitBreaker {
            state: CircuitState::Closed,
            failures: 0,
            last_failure: Instant::now(),
            threshold,
            reset_duration: Duration::from_secs(reset_secs),
        }
    }

    pub fn get_state(&mut self) -> &CircuitState {
        if self.state == CircuitState::Open && self.last_failure.elapsed() >= self.reset_duration {
            self.state = CircuitState::HalfOpen;
        }
        &self.state
    }

    pub fn record_success(&mut self) {
        self.failures = 0;
        self.state = CircuitState::Closed;
    }

    pub fn record_failure(&mut self) {
        self.failures += 1;
        self.last_failure = Instant::now();
        if self.failures >= self.threshold {
            self.state = CircuitState::Open;
        }
    }

    pub fn allow_request(&mut self) -> bool {
        matches!(self.get_state(), CircuitState::Closed | CircuitState::HalfOpen)
    }
}

// ═══ SDK ═══

const DEFAULT_RETRYABLE: &[u16] = &[429, 500, 502, 503, 504];

pub struct CaasRustSdk {
    pub gateway_base_url: String,
    pub api_key: String,
    pub project_id: Option<String>,
    timeout: Duration,
    max_retries: u32,
    base_delay_ms: u64,
    max_delay_ms: u64,
    cb: CircuitBreaker,
    client: reqwest::blocking::Client,
}

impl CaasRustSdk {
    pub fn new(gateway_base_url: &str, api_key: &str, project_id: Option<&str>) -> Self {
        Self::with_options(gateway_base_url, api_key, project_id, 10, 3, 300, 10000, 5, 30)
    }

    pub fn with_options(
        gateway_base_url: &str, api_key: &str, project_id: Option<&str>,
        timeout_secs: u64, max_retries: u32, base_delay_ms: u64, max_delay_ms: u64,
        cb_threshold: u32, cb_reset_secs: u64,
    ) -> Self {
        let timeout = Duration::from_secs(timeout_secs);
        CaasRustSdk {
            gateway_base_url: gateway_base_url.to_string(),
            api_key: api_key.to_string(),
            project_id: project_id.map(|v| v.to_string()),
            timeout,
            max_retries,
            base_delay_ms,
            max_delay_ms,
            cb: CircuitBreaker::new(cb_threshold, cb_reset_secs),
            client: reqwest::blocking::Client::builder().timeout(timeout).build().unwrap(),
        }
    }

    pub fn circuit_state(&mut self) -> &CircuitState {
        self.cb.get_state()
    }

    pub fn canonical_headers(&self) -> HashMap<String, String> {
        let mut headers = HashMap::new();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        headers.insert("x-api-key".to_string(), self.api_key.clone());
        headers.insert("x-correlation-id".to_string(), format!("sdkrust_{}", now));
        headers.insert("content-type".to_string(), "application/json".to_string());
        if let Some(ref pid) = self.project_id {
            headers.insert("x-project-id".to_string(), pid.clone());
        }
        headers
    }

    fn do_request(&mut self, method: &str, path: &str, body: Option<&str>,
                   extra_headers: HashMap<String, String>, idempotent: bool) -> Result<Option<String>, SdkError> {
        if !self.cb.allow_request() {
            return Err(SdkError::circuit_open());
        }

        let has_idem = extra_headers.contains_key("idempotency-key");
        let non_idempotent_method = method == "POST" || method == "PATCH";
        let can_retry = idempotent || !non_idempotent_method || has_idem;
        let max_attempts = if can_retry { self.max_retries + 1 } else { 1 };
        let mut last_err: Option<SdkError> = None;
        let url = format!("{}{}", self.gateway_base_url, path);

        for attempt in 0..max_attempts {
            let mut req_builder = match method {
                "POST" => self.client.post(&url),
                _ => self.client.get(&url),
            };

            for (k, v) in &extra_headers {
                req_builder = req_builder.header(k.as_str(), v.as_str());
            }

            if let Some(b) = body {
                req_builder = req_builder.body(b.to_string());
            }

            match req_builder.send() {
                Ok(response) => {
                    let status = response.status().as_u16();

                    if status >= 200 && status < 400 {
                        self.cb.record_success();
                        if status == 204 { return Ok(None); }
                        let text = response.text().unwrap_or_default();
                        return Ok(Some(text));
                    }

                    let retry_after = response.headers()
                        .get("retry-after")
                        .and_then(|v| v.to_str().ok())
                        .map(|v| v.to_string());
                    let resp_body = response.text().unwrap_or_default();
                    let err = classify_http_error(status, &resp_body, retry_after.as_deref());

                    if !err.retryable || !DEFAULT_RETRYABLE.contains(&status) {
                        self.cb.record_failure();
                        return Err(err);
                    }

                    if err.code == SdkErrorCode::ThrottleError {
                        if let Some(secs) = err.retry_after_secs {
                            thread::sleep(Duration::from_secs(secs));
                        }
                    }

                    last_err = Some(err);
                }
                Err(e) => {
                    let err = if e.is_timeout() {
                        SdkError::timeout(&format!("Timeout on {}", path))
                    } else {
                        SdkError::network(&format!("Network error: {}", e))
                    };
                    last_err = Some(err);
                    if !can_retry {
                        self.cb.record_failure();
                        return Err(last_err.take().unwrap());
                    }
                }
            }

            if attempt < max_attempts - 1 {
                let base = self.base_delay_ms as f64 * 2f64.powi(attempt as i32);
                let jittered = base * (0.5 + rand::random::<f64>());
                let delay = jittered.min(self.max_delay_ms as f64) as u64;
                thread::sleep(Duration::from_millis(delay));
            }
        }

        self.cb.record_failure();
        Err(last_err.unwrap_or_else(|| SdkError {
            message: "Request failed after retries".to_string(),
            code: SdkErrorCode::UnknownError,
            status: None,
            retryable: false,
            retry_after_secs: None,
        }))
    }

    // ── Public API ──

    pub fn health(&mut self) -> Result<Option<String>, SdkError> {
        let headers = self.canonical_headers();
        self.do_request("GET", "/api/v1/sdk/health", None, headers, true)
    }

    pub fn capabilities(&mut self) -> Result<Option<String>, SdkError> {
        let headers = self.canonical_headers();
        self.do_request("GET", "/api/v1/sdk/capabilities", None, headers, true)
    }

    pub fn create_session(&mut self, user_external_id: &str) -> Result<Option<String>, SdkError> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        let mut headers = self.canonical_headers();
        headers.insert("idempotency-key".to_string(), format!("idem_{}", now));
        headers.insert("x-timestamp".to_string(), format!("{}", now / 1000));
        headers.insert("x-nonce".to_string(), format!("n_{}", now));

        let mut body_map = serde_json::Map::new();
        body_map.insert("user_external_id".to_string(), serde_json::Value::String(user_external_id.to_string()));
        if let Some(ref pid) = self.project_id {
            body_map.insert("project_id".to_string(), serde_json::Value::String(pid.clone()));
        }
        let body = serde_json::to_string(&body_map).unwrap();

        self.do_request("POST", "/api/v1/sdk/session", Some(&body), headers, false)
    }

    pub fn refresh(&mut self, refresh_token: &str) -> Result<Option<String>, SdkError> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        let mut headers = HashMap::new();
        headers.insert("content-type".to_string(), "application/json".to_string());
        headers.insert("x-correlation-id".to_string(), format!("sdkrust_{}", now));
        headers.insert("idempotency-key".to_string(), format!("idem_ref_{}", now));

        let body = format!(r#"{{"refresh_token":"{}"}}"#, refresh_token);
        self.do_request("POST", "/api/v1/sdk/refresh", Some(&body), headers, false)
    }

    pub fn logout(&mut self, access_token: &str) -> Result<Option<String>, SdkError> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        let mut headers = HashMap::new();
        headers.insert("authorization".to_string(), format!("Bearer {}", access_token));
        headers.insert("x-correlation-id".to_string(), format!("sdkrust_{}", now));
        headers.insert("idempotency-key".to_string(), format!("idem_logout_{}", now));
        self.do_request("POST", "/api/v1/sdk/logout", None, headers, false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_headers_include_required_fields() {
        let sdk = CaasRustSdk::new("http://gateway:3000", "key-1", Some("project-1"));
        let headers = sdk.canonical_headers();
        assert_eq!(headers.get("x-api-key").unwrap(), "key-1");
        assert_eq!(headers.get("x-project-id").unwrap(), "project-1");
        assert!(headers.get("x-correlation-id").unwrap().starts_with("sdkrust_"));
        assert_eq!(headers.get("content-type").unwrap(), "application/json");
    }

    #[test]
    fn error_codes_are_stable() {
        let auth = SdkError::auth("fail", 401);
        assert_eq!(auth.code, SdkErrorCode::AuthError);
        assert_eq!(auth.status, Some(401));
        assert!(!auth.retryable);

        let throttle = SdkError::throttle("rate", Some(5));
        assert_eq!(throttle.code, SdkErrorCode::ThrottleError);
        assert!(throttle.retryable);
        assert_eq!(throttle.retry_after_secs, Some(5));

        let server = SdkError::server("down", 502);
        assert_eq!(server.code, SdkErrorCode::ServerError);
        assert!(server.retryable);

        let net = SdkError::network("fail");
        assert!(net.retryable);

        let circuit = SdkError::circuit_open();
        assert!(!circuit.retryable);
    }

    #[test]
    fn circuit_breaker_opens_after_threshold() {
        let mut cb = CircuitBreaker::new(3, 1);
        assert_eq!(*cb.get_state(), CircuitState::Closed);
        cb.record_failure();
        cb.record_failure();
        cb.record_failure();
        assert_eq!(*cb.get_state(), CircuitState::Open);
        assert!(!cb.allow_request());
    }

    #[test]
    fn circuit_breaker_resets_on_success() {
        let mut cb = CircuitBreaker::new(2, 1); // 1 second reset
        cb.record_failure();
        cb.record_failure();
        // Still open — reset time hasn't elapsed
        assert_eq!(*cb.get_state(), CircuitState::Open);
        // Override reset_duration to zero so half-open triggers immediately
        cb.reset_duration = Duration::from_millis(0);
        thread::sleep(Duration::from_millis(10));
        assert_eq!(*cb.get_state(), CircuitState::HalfOpen);
        cb.record_success();
        assert_eq!(*cb.get_state(), CircuitState::Closed);
    }

    #[test]
    fn sdk_initial_circuit_is_closed() {
        let mut sdk = CaasRustSdk::new("http://gateway:3000", "key-1", None);
        assert_eq!(*sdk.circuit_state(), CircuitState::Closed);
    }

    #[test]
    fn validation_error_codes_stable() {
        let err = SdkError::validation("bad payload", 400);
        assert_eq!(err.code, SdkErrorCode::ValidationError);
        assert_eq!(err.status, Some(400));
        assert!(!err.retryable);
    }

    #[test]
    fn timeout_error_codes_stable() {
        let err = SdkError::timeout("timed out");
        assert_eq!(err.code, SdkErrorCode::TimeoutError);
        assert!(err.retryable);
    }

    #[test]
    fn all_error_codes_display_correctly() {
        assert_eq!(format!("{}", SdkError::auth("a", 401)), "[AUTH_ERROR] a");
        assert_eq!(format!("{}", SdkError::validation("v", 400)), "[VALIDATION_ERROR] v");
        assert_eq!(format!("{}", SdkError::throttle("t", None)), "[THROTTLE_ERROR] t");
        assert_eq!(format!("{}", SdkError::server("s", 500)), "[SERVER_ERROR] s");
        assert_eq!(format!("{}", SdkError::network("n")), "[NETWORK_ERROR] n");
        assert_eq!(format!("{}", SdkError::timeout("to")), "[TIMEOUT_ERROR] to");
        assert_eq!(format!("{}", SdkError::circuit_open()), "[CIRCUIT_OPEN] Circuit breaker is open");
    }

    #[test]
    fn error_branching_with_match() {
        let err = SdkError::throttle("rate limit", Some(10));
        let retry_after = match err.code {
            SdkErrorCode::ThrottleError => err.retry_after_secs,
            _ => None,
        };
        assert_eq!(retry_after, Some(10));
    }

    #[test]
    fn correlation_id_prefix() {
        let sdk = CaasRustSdk::new("http://gateway:3000", "key-1", None);
        let headers = sdk.canonical_headers();
        let cid = headers.get("x-correlation-id").unwrap();
        assert!(cid.starts_with("sdkrust_"), "Expected sdkrust_ prefix, got {}", cid);
    }
}
