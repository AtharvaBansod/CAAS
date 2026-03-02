import json as _json

import pytest

from caas_sdk import (
    CaasPythonSdk,
    CircuitBreaker,
    SdkAuthError,
    SdkCircuitOpenError,
    SdkError,
    SdkNetworkError,
    SdkServerError,
    SdkThrottleError,
    SdkTimeoutError,
    SdkValidationError,
)


class DummyResponse:
    def __init__(self, status_code=200, payload=None, headers=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = _json.dumps(self._payload) if isinstance(self._payload, dict) else str(self._payload)
        self.headers = headers or {}

    def json(self):
        return self._payload


def _make_sdk(**kw):
    defaults = dict(
        gateway_base_url="http://gateway:3000",
        api_key="api-key",
        project_id="project-1",
        max_retries=2,
        base_delay_s=0.001,
        max_delay_s=0.005,
    )
    defaults.update(kw)
    return CaasPythonSdk(**defaults)


def test_create_session_headers(monkeypatch):
    captured = {}

    def fake_request(method, url, json=None, headers=None, timeout=None):
        captured["method"] = method
        captured["url"] = url
        captured["headers"] = headers
        captured["body"] = json
        return DummyResponse(payload={
            "access_token": "a",
            "refresh_token": "r",
            "expires_in": 900,
            "token_type": "Bearer",
        })

    monkeypatch.setattr("requests.request", fake_request)

    sdk = _make_sdk()
    sdk.create_session("user-1")

    assert captured["headers"]["x-api-key"] == "api-key"
    assert captured["headers"]["x-project-id"] == "project-1"
    assert captured["headers"]["idempotency-key"].startswith("idem_")


def test_auth_error_on_401(monkeypatch):
    monkeypatch.setattr("requests.request", lambda *a, **kw: DummyResponse(401, {"error": "Unauthorized"}))
    sdk = _make_sdk()
    with pytest.raises(SdkAuthError) as exc_info:
        sdk.health()
    assert exc_info.value.code == "AUTH_ERROR"
    assert exc_info.value.status == 401


def test_validation_error_on_400(monkeypatch):
    monkeypatch.setattr("requests.request", lambda *a, **kw: DummyResponse(400, {"error": "Bad"}))
    sdk = _make_sdk()
    with pytest.raises(SdkValidationError):
        sdk.health()


def test_throttle_error_on_429(monkeypatch):
    call_count = 0

    def fake(*a, **kw):
        nonlocal call_count
        call_count += 1
        return DummyResponse(429, {"error": "Rate limited"})

    monkeypatch.setattr("requests.request", fake)
    sdk = _make_sdk()
    with pytest.raises(SdkThrottleError):
        sdk.health()
    assert call_count == 3  # 1 + 2 retries


def test_retry_then_succeed(monkeypatch):
    calls = []

    def fake(*a, **kw):
        calls.append(1)
        if len(calls) == 1:
            return DummyResponse(500, {"error": "fail"})
        return DummyResponse(200, {"status": "ok"})

    monkeypatch.setattr("requests.request", fake)
    sdk = _make_sdk()
    result = sdk.health()
    assert result == {"status": "ok"}
    assert len(calls) == 2


def test_error_code_is_stable(monkeypatch):
    monkeypatch.setattr("requests.request", lambda *a, **kw: DummyResponse(403, {"error": "Forbidden"}))
    sdk = _make_sdk()
    try:
        sdk.health()
    except SdkError as e:
        assert e.code == "AUTH_ERROR"
        assert e.retryable is False


def test_circuit_breaker_opens():
    cb = CircuitBreaker(failure_threshold=3, reset_timeout_s=0.01)
    assert cb.state == "closed"
    cb.record_failure()
    cb.record_failure()
    cb.record_failure()
    assert cb.state == "open"
    assert cb.allow_request() is False


def test_circuit_breaker_sdk_integration(monkeypatch):
    monkeypatch.setattr("requests.request", lambda *a, **kw: DummyResponse(500, {}))
    sdk = _make_sdk(cb_failure_threshold=1, max_retries=0)
    with pytest.raises(SdkServerError):
        sdk.health()
    with pytest.raises(SdkCircuitOpenError):
        sdk.health()


def test_network_error_on_connection_failure(monkeypatch):
    import requests as _requests

    def fake_connect_error(*a, **kw):
        raise _requests.ConnectionError("Connection refused")

    monkeypatch.setattr("requests.request", fake_connect_error)
    sdk = _make_sdk(max_retries=0)
    with pytest.raises(SdkNetworkError) as exc_info:
        sdk.health()
    assert exc_info.value.code == "NETWORK_ERROR"
    assert exc_info.value.retryable is True


def test_timeout_error_on_read_timeout(monkeypatch):
    import requests as _requests

    def fake_timeout(*a, **kw):
        raise _requests.Timeout("Read timed out")

    monkeypatch.setattr("requests.request", fake_timeout)
    sdk = _make_sdk(max_retries=0)
    with pytest.raises(SdkTimeoutError) as exc_info:
        sdk.health()
    assert exc_info.value.code == "TIMEOUT_ERROR"
    assert exc_info.value.retryable is True


def test_circuit_breaker_resets_after_timeout():
    import time
    cb = CircuitBreaker(failure_threshold=2, reset_timeout_s=0.05)
    cb.record_failure()
    cb.record_failure()
    assert cb.state == "open"
    assert cb.allow_request() is False
    time.sleep(0.06)
    assert cb.state == "half-open"
    assert cb.allow_request() is True
    cb.record_success()
    assert cb.state == "closed"


def test_post_without_idempotency_key_not_retried(monkeypatch):
    """POST requests without idempotency-key should NOT be retried on 500."""
    call_count = 0

    def fake(*a, **kw):
        nonlocal call_count
        call_count += 1
        return DummyResponse(500, {"error": "server error"})

    monkeypatch.setattr("requests.request", fake)
    sdk = _make_sdk(max_retries=3)
    # Call _request directly with POST, no idempotency-key
    with pytest.raises(SdkServerError):
        sdk._request("POST", "/api/v1/test", json_body={"data": "x"}, headers={})
    # POST without idem-key should only attempt once (no retries)
    assert call_count == 1


def test_all_error_classes_are_subclass_of_sdk_error():
    assert issubclass(SdkNetworkError, SdkError)
    assert issubclass(SdkTimeoutError, SdkError)
    assert issubclass(SdkAuthError, SdkError)
    assert issubclass(SdkValidationError, SdkError)
    assert issubclass(SdkThrottleError, SdkError)
    assert issubclass(SdkServerError, SdkError)
    assert issubclass(SdkCircuitOpenError, SdkError)
