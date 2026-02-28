import time
from typing import Any, Dict, Optional

import requests


class CaasPythonSdk:
    def __init__(self, gateway_base_url: str, api_key: str, project_id: Optional[str] = None, timeout: float = 10.0):
        self.gateway_base_url = gateway_base_url.rstrip("/")
        self.api_key = api_key
        self.project_id = project_id
        self.timeout = timeout

    def _headers(self, include_key: bool = True) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "x-correlation-id": f"sdkpy_{int(time.time() * 1000)}",
        }
        if include_key:
            headers["x-api-key"] = self.api_key
        if self.project_id:
            headers["x-project-id"] = self.project_id
        return headers

    def _request(self, method: str, path: str, *, json_body: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None):
        url = f"{self.gateway_base_url}{path}"
        response = requests.request(method, url, json=json_body, headers=headers, timeout=self.timeout)
        if response.status_code >= 400:
            raise RuntimeError(f"SDK request failed ({response.status_code}) {response.text[:180]}")
        if response.status_code == 204:
            return None
        return response.json()

    def health(self):
        return self._request("GET", "/api/v1/sdk/health", headers=self._headers())

    def capabilities(self):
        return self._request("GET", "/api/v1/sdk/capabilities", headers=self._headers())

    def create_session(self, user_external_id: str, project_id: Optional[str] = None):
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
                **({"project_id": project_id} if project_id else ({"project_id": self.project_id} if self.project_id else {})),
            },
        )

    def refresh(self, refresh_token: str):
        return self._request(
            "POST",
            "/api/v1/sdk/refresh",
            headers={"Content-Type": "application/json", "x-correlation-id": f"sdkpy_{int(time.time() * 1000)}"},
            json_body={"refresh_token": refresh_token},
        )

    def logout(self, access_token: str):
        return self._request(
            "POST",
            "/api/v1/sdk/logout",
            headers={"Authorization": f"Bearer {access_token}", "x-correlation-id": f"sdkpy_{int(time.time() * 1000)}"},
        )
