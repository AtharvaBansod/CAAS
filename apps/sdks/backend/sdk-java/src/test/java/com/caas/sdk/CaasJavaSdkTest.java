package com.caas.sdk;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CaasJavaSdkTest {
    @Test
    void canonicalHeadersContainApiKey() {
        CaasJavaSdk sdk = new CaasJavaSdk("http://gateway:3000", "key-1", "project-1");
        assertEquals("key-1", sdk.canonicalHeaders().get("x-api-key"));
        assertEquals("project-1", sdk.canonicalHeaders().get("x-project-id"));
    }

    @Test
    void errorHierarchyCodesAreStable() {
        var authErr = new CaasJavaSdk.SdkAuthException("fail", 401);
        assertEquals("AUTH_ERROR", authErr.getCode());
        assertEquals(401, authErr.getStatus());
        assertFalse(authErr.isRetryable());

        var throttleErr = new CaasJavaSdk.SdkThrottleException("rate", 5000L);
        assertEquals("THROTTLE_ERROR", throttleErr.getCode());
        assertTrue(throttleErr.isRetryable());
        assertEquals(5000L, throttleErr.getRetryAfterMs());

        var serverErr = new CaasJavaSdk.SdkServerException("down", 502);
        assertEquals("SERVER_ERROR", serverErr.getCode());
        assertTrue(serverErr.isRetryable());

        var netErr = new CaasJavaSdk.SdkNetworkException("timeout");
        assertEquals("NETWORK_ERROR", netErr.getCode());
        assertTrue(netErr.isRetryable());

        var circuitErr = new CaasJavaSdk.SdkCircuitOpenException(30000);
        assertEquals("CIRCUIT_OPEN", circuitErr.getCode());
        assertFalse(circuitErr.isRetryable());
    }

    @Test
    void circuitBreakerInitiallyClosed() {
        CaasJavaSdk sdk = new CaasJavaSdk("http://gateway:3000", "key-1", "project-1");
        assertEquals("closed", sdk.getCircuitState());
    }

    @Test
    void validationErrorCodesStable() {
        var valErr = new CaasJavaSdk.SdkValidationException("bad request", 400);
        assertEquals("VALIDATION_ERROR", valErr.getCode());
        assertEquals(400, valErr.getStatus());
        assertFalse(valErr.isRetryable());
    }

    @Test
    void timeoutErrorCodesStable() {
        var timeoutErr = new CaasJavaSdk.SdkTimeoutException("timed out", 10000);
        assertEquals("TIMEOUT_ERROR", timeoutErr.getCode());
        assertNull(timeoutErr.getStatus());
        assertTrue(timeoutErr.isRetryable());
    }

    @Test
    void circuitBreakerOpensAfterThreshold() {
        // Use the SDK itself which has internal CB with threshold of 5
        // Instead create a separate SDK with low threshold to test
        CaasJavaSdk sdk = new CaasJavaSdk("http://invalid-host:59999", "k", "p",
            100, 0, 1, 5, 2, 60000);
        assertEquals("closed", sdk.getCircuitState());

        // These calls fail (connection refused) and trigger CB recordFailure
        for (int i = 0; i < 2; i++) {
            try { sdk.health(); } catch (CaasJavaSdk.SdkException e) { /* expected */ }
        }
        assertEquals("open", sdk.getCircuitState());
    }

    @Test
    void circuitBreakerThrowsCircuitOpenException() {
        CaasJavaSdk sdk = new CaasJavaSdk("http://invalid-host:59999", "k", "p",
            100, 0, 1, 5, 1, 60000);

        // Trip the circuit
        try { sdk.health(); } catch (CaasJavaSdk.SdkException e) { /* expected */ }
        assertEquals("open", sdk.getCircuitState());

        // Next call should throw SdkCircuitOpenException
        assertThrows(CaasJavaSdk.SdkCircuitOpenException.class, () -> sdk.health());
    }

    @Test
    void allErrorClassesExtendSdkException() {
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkNetworkException.class));
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkTimeoutException.class));
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkAuthException.class));
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkValidationException.class));
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkThrottleException.class));
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkServerException.class));
        assertTrue(CaasJavaSdk.SdkException.class.isAssignableFrom(CaasJavaSdk.SdkCircuitOpenException.class));
    }

    @Test
    void sdkCanBranchOnErrorTypesWithInstanceof() {
        CaasJavaSdk.SdkException err = new CaasJavaSdk.SdkAuthException("unauthorized", 401);
        assertTrue(err instanceof CaasJavaSdk.SdkAuthException);

        CaasJavaSdk.SdkException throttle = new CaasJavaSdk.SdkThrottleException("limited", 1000L);
        assertTrue(throttle instanceof CaasJavaSdk.SdkThrottleException);
        assertFalse(throttle instanceof CaasJavaSdk.SdkAuthException);
    }

    @Test
    void correlationIdPrefixIsCorrect() {
        CaasJavaSdk sdk = new CaasJavaSdk("http://gateway:3000", "key-1", "project-1");
        String corrId = sdk.canonicalHeaders().get("x-correlation-id");
        assertTrue(corrId.startsWith("sdkjava_"), "Correlation ID should start with sdkjava_");
    }
}
