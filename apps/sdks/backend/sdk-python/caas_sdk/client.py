"""
CaaS Python SDK — Hardened Backend SDK
SDKBE-REL-001: Typed Error Hierarchy, Retry/Backoff, Circuit Breaker
"""

import math
import random
import time
from typing import Any, Dict, Optional, Set

import requests


# ═══════ Typed Error Hierarchy ═══════

class SdkError(Exception):
    """Base error — consumers branch on `code` without parsing messages."""
    def __init__(self, message: str, code: str, status: Optional[int] = None,
                 retryable: bool = False, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.retryable = retryable
        self.details = details or {}


class SdkNetworkError(SdkError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "NETWORK_ERROR", retryable=True, details=details)


class SdkTimeoutError(SdkError):
    def __init__(self, message: str, timeout_s: float):
        super().__init__(message, "TIMEOUT_ERROR", retryable=True, details={"timeout_s": timeout_s})
        self.timeout_s = timeout_s


class SdkAuthError(SdkError):
    def __init__(self, message: str, status: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "AUTH_ERROR", status=status, retryable=False, details=details)


class SdkValidationError(SdkError):
    def __init__(self, message: str, status: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", status=status, retryable=False, details=details)


class SdkThrottleError(SdkError):
    def __init__(self, message: str, retry_after_s: Optional[float] = None):
        super().__init__(message, "THROTTLE_ERROR", status=429, retryable=True,
                         details={"retry_after_s": retry_after_s})
        self.retry_after_s = retry_after_s


class SdkServerError(SdkError):
    def __init__(self, message: str, status: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "SERVER_ERROR", status=status, retryable=True, details=details)


class SdkCircuitOpenError(SdkError):
    def __init__(self, reset_after_s: float):
        super().__init__("Circuit breaker is open — requests blocked", "CIRCUIT_OPEN",
                         retryable=False, details={"reset_after_s": reset_after_s})


# ═══════ Circuit Breaker ═══════

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_timeout_s: float = 30.0):
        self._state = "closed"
        self._failures = 0
        self._last_failure_time = 0.0
        self._threshold = failure_threshold
        self._reset_s = reset_timeout_s

    @property
    def state(self) -> str:
        if self._state == "open" and (time.time() - self._last_failure_time) >= self._reset_s:
            self._state = "half-open"
        return self._state

    def record_success(self) -> None:
        self._failures = 0
        self._state = "closed"

    def record_failure(self) -> None:
        self._failures += 1
        self._last_failure_time = time.time()
        if self._failures >= self._threshold:
            self._state = "open"

    def allow_request(self) -> bool:
        return self.state in ("closed", "half-open")


# ═══════ Classification ═══════

DEFAULT_RETRYABLE_STATUSES: Set[int] = {429, 500, 502, 503, 504}
NON_IDEMPOTENT_METHODS: Set[str] = {"POST", "PATCH"}


def _classify_http_error(status: int, body: str, retry_after: Optional[str] = None) -> SdkError:
    details: Dict[str, Any] = {"response_body": body[:500]}
    try:
        import json
        parsed = json.loads(body)
        if isinstance(parsed, dict):
            details.update(parsed)
    except Exception:
        pass

    if status in (401, 403):
        return SdkAuthError(f"Auth failed ({status})", status, details)
    if status in (400, 422):
        return SdkValidationError(f"Validation error ({status})", status, details)
    if status == 429:
        ra = float(retry_after) if retry_after else None
        return SdkThrottleError("Rate limited (429)", ra)
    if status >= 500:
        return SdkServerError(f"Server error ({status})", status, details)
    return SdkError(f"Request failed ({status})", "UNKNOWN_ERROR", status, details=details)


def _jitter(base: float) -> float:
    return base * (0.5 + random.random())


# ═══════ Main SDK ═══════

class CaasPythonSdk:
    def __init__(
        self,
        gateway_base_url: str,
        api_key: str,
        project_id: Optional[str] = None,
        timeout: float = 10.0,
        max_retries: int = 3,
        base_delay_s: float = 0.3,
        max_delay_s: float = 10.0,
        retryable_statuses: Optional[Set[int]] = None,
        retry_on_network_error: bool = True,
        cb_failure_threshold: int = 5,
        cb_reset_timeout_s: float = 30.0,
    ):
        self.gateway_base_url = gateway_base_url.rstrip("/")
        self.api_key = api_key
        self.project_id = project_id
        self.timeout = timeout
        self._max_retries = max_retries
        self._base_delay = base_delay_s
        self._max_delay = max_delay_s
        self._retryable_statuses = retryable_statuses or DEFAULT_RETRYABLE_STATUSES
        self._retry_on_network_error = retry_on_network_error
        self._cb = CircuitBreaker(cb_failure_threshold, cb_reset_timeout_s)

    @property
    def circuit_state(self) -> str:
        return self._cb.state

    def _headers(self, include_key: bool = True) -> Dict[str, str]:
        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "x-correlation-id": f"sdkpy_{int(time.time() * 1000)}",
        }
        if include_key:
            headers["x-api-key"] = self.api_key
        if self.project_id:
            headers["x-project-id"] = self.project_id
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        idempotent: bool = False,
    ) -> Any:
        if not self._cb.allow_request():
            raise SdkCircuitOpenError(self._max_delay)

        has_idem_key = bool(headers and "idempotency-key" in headers)
        can_retry = idempotent or method.upper() not in NON_IDEMPOTENT_METHODS or has_idem_key
        max_attempts = (self._max_retries + 1) if can_retry else 1
        last_err: Optional[SdkError] = None
        url = f"{self.gateway_base_url}{path}"

        for attempt in range(max_attempts):
            try:
                response = requests.request(
                    method, url, json=json_body, headers=headers, timeout=self.timeout
                )

                if response.status_code < 400:
                    self._cb.record_success()
                    if response.status_code == 204:
                        return None
                    return response.json()

                retry_after = response.headers.get("Retry-After")
                err = _classify_http_error(response.status_code, response.text, retry_after)

                if not err.retryable or response.status_code not in self._retryable_statuses:
                    self._cb.record_failure()
                    raise err

                last_err = err
                if isinstance(err, SdkThrottleError) and err.retry_after_s:
                    time.sleep(err.retry_after_s)
                    continue

            except SdkError:
                raise
            except requests.exceptions.Timeout:
                te = SdkTimeoutError(f"Request to {path} timed out ({self.timeout}s)", self.timeout)
                last_err = te
                if not can_retry or not self._retry_on_network_error:
                    self._cb.record_failure()
                    raise te
            except requests.exceptions.ConnectionError as exc:
                ne = SdkNetworkError(f"Network error: {exc}", {"cause": str(exc)})
                last_err = ne
                if not can_retry or not self._retry_on_network_error:
                    self._cb.record_failure()
                    raise ne
            except Exception as exc:
                ne = SdkNetworkError(f"Unexpected error: {exc}", {"cause": str(exc)})
                last_err = ne
                if not can_retry:
                    self._cb.record_failure()
                    raise ne

            if attempt < max_attempts - 1:
                delay = min(_jitter(self._base_delay * (2 ** attempt)), self._max_delay)
                time.sleep(delay)

        self._cb.record_failure()
        raise last_err or SdkError("Request failed after retries", "UNKNOWN_ERROR")

    # ── Public API ──

    def health(self) -> Any:
        return self._request("GET", "/api/v1/sdk/health", headers=self._headers(), idempotent=True)

    def capabilities(self) -> Any:
        return self._request("GET", "/api/v1/sdk/capabilities", headers=self._headers(), idempotent=True)

    def create_session(self, user_external_id: str, project_id: Optional[str] = None) -> Any:
        headers = self._headers()
        headers["idempotency-key"] = f"idem_{int(time.time() * 1000)}"
        headers["x-timestamp"] = str(int(time.time()))
        headers["x-nonce"] = f"n_{int(time.time() * 1000)}"
        return self._request(
            "POST",
            "/api/v1/sdk/session",
            headers=headers,
            json_body={
                "user_external_id": user_external_id,
                **({"project_id": project_id} if project_id else
                   ({"project_id": self.project_id} if self.project_id else {})),
            },
        )

    def refresh(self, refresh_token: str) -> Any:
        headers = {
            "Content-Type": "application/json",
            "x-correlation-id": f"sdkpy_{int(time.time() * 1000)}",
            "idempotency-key": f"idem_ref_{int(time.time() * 1000)}",
        }
        return self._request(
            "POST", "/api/v1/sdk/refresh",
            headers=headers,
            json_body={"refresh_token": refresh_token},
        )

    def logout(self, access_token: str) -> Any:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "x-correlation-id": f"sdkpy_{int(time.time() * 1000)}",
            "idempotency-key": f"idem_logout_{int(time.time() * 1000)}",
        }
        return self._request("POST", "/api/v1/sdk/logout", headers=headers)
