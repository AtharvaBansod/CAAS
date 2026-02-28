use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct CaasRustSdk {
    pub gateway_base_url: String,
    pub api_key: String,
    pub project_id: Option<String>,
}

impl CaasRustSdk {
    pub fn new(gateway_base_url: &str, api_key: &str, project_id: Option<&str>) -> Self {
        Self {
            gateway_base_url: gateway_base_url.to_string(),
            api_key: api_key.to_string(),
            project_id: project_id.map(|v| v.to_string()),
        }
    }

    pub fn canonical_headers(&self) -> HashMap<String, String> {
        let mut headers = HashMap::new();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        headers.insert("x-api-key".to_string(), self.api_key.clone());
        headers.insert("x-correlation-id".to_string(), format!("sdkrust_{}", now));
        if let Some(project_id) = &self.project_id {
            headers.insert("x-project-id".to_string(), project_id.clone());
        }
        headers
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
    }
}
