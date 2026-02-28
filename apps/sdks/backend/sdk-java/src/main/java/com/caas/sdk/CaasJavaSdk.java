package com.caas.sdk;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Map;

public class CaasJavaSdk {
    private final String gatewayBaseUrl;
    private final String apiKey;
    private final String projectId;
    private final HttpClient client;

    public CaasJavaSdk(String gatewayBaseUrl, String apiKey, String projectId) {
        this.gatewayBaseUrl = gatewayBaseUrl;
        this.apiKey = apiKey;
        this.projectId = projectId;
        this.client = HttpClient.newHttpClient();
    }

    public Map<String, String> canonicalHeaders() {
        return Map.of(
            "x-api-key", apiKey,
            "x-correlation-id", "sdkjava_" + Instant.now().toEpochMilli(),
            "x-project-id", projectId == null ? "" : projectId
        );
    }

    public int healthStatus() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(gatewayBaseUrl + "/api/v1/sdk/health"))
            .GET()
            .header("x-api-key", apiKey)
            .header("x-correlation-id", "sdkjava_" + Instant.now().toEpochMilli())
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode();
    }
}
