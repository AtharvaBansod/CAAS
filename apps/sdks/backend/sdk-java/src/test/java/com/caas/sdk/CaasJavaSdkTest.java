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
}
