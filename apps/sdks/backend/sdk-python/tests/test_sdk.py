from caas_sdk import CaasPythonSdk


class DummyResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = str(self._payload)

    def json(self):
        return self._payload


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

    sdk = CaasPythonSdk("http://gateway:3000", "api-key", project_id="project-1")
    sdk.create_session("user-1")

    assert captured["headers"]["x-api-key"] == "api-key"
    assert captured["headers"]["x-project-id"] == "project-1"
    assert captured["headers"]["idempotency-key"].startswith("idem_")
