# CAAS Platform - Full System Test Report

**Generated:** 2026-02-25 02:21:34Z
**Raw Report:** full-system-raw-20260225-022033.json
**Runner Exit Code:** 0
**Stack Lifecycle:** Skipped (reusing running stack)

## Summary

| Metric | Count |
|--------|-------|
| **Total Tests** | 125 |
| **Passed** | 116 |
| **Warnings** | 9 |
| **Failed** | 0 |

> ALL TESTS PASSED - The entire CAAS platform is verified and operational.

## Phase Breakdown

| Phase | Name | Tests | Passed | Warn | Fail |
|-------|------|-------|--------|------|------|
| 1 | infrastructure-health | 11 | 11 | 0 | 0 |
| 2 | tenant-onboarding | 3 | 3 | 0 | 0 |
| 3 | api-key-lifecycle | 5 | 5 | 0 | 0 |
| 4 | sdk-session-lifecycle | 4 | 4 | 0 | 0 |
| 5 | token-validation | 3 | 3 | 0 | 0 |
| 5.5 | token-refresh | 1 | 1 | 0 | 0 |
| 6 | gateway-routing | 9 | 9 | 0 | 0 |
| 7 | cross-service | 8 | 8 | 0 | 0 |
| 8 | socket-realtime | 24 | 15 | 9 | 0 |
| 9 | security-isolation | 6 | 6 | 0 | 0 |
| 10 | swagger-discovery | 46 | 46 | 0 | 0 |
| 11 | session-logout | 5 | 5 | 0 | 0 |

## Docker Compose Status
```text
NAME                       IMAGE                                                  COMMAND                  SERVICE               CREATED          STATUS                    PORTS
caas-auth-service          caas-auth-service                                      "docker-entrypoint.sΓÇª"   auth-service          19 minutes ago   Up 19 minutes (healthy)   0.0.0.0:3007->3001/tcp, [::]:3007->3001/tcp
caas-compliance-service    caas-compliance-service                                "docker-entrypoint.sΓÇª"   compliance-service    2 hours ago      Up 2 hours (healthy)      0.0.0.0:3008->3008/tcp, [::]:3008->3008/tcp
caas-crypto-service        caas-crypto-service                                    "docker-entrypoint.sΓÇª"   crypto-service        2 hours ago      Up 2 hours (healthy)      0.0.0.0:3009->3009/tcp, [::]:3009->3009/tcp
caas-elasticsearch         docker.elastic.co/elasticsearch/elasticsearch:8.11.0   "/bin/tini -- /usr/lΓÇª"   elasticsearch         2 hours ago      Up 2 hours (healthy)      0.0.0.0:9200->9200/tcp, [::]:9200->9200/tcp
caas-gateway               caas-gateway                                           "docker-entrypoint.sΓÇª"   gateway               36 minutes ago   Up 36 minutes (healthy)   0.0.0.0:3000-3001->3000-3001/tcp, [::]:3000-3001->3000-3001/tcp
caas-kafka-1               confluentinc/cp-kafka:7.5.0                            "/etc/confluent/dockΓÇª"   kafka-1               2 hours ago      Up 2 hours (healthy)      0.0.0.0:9092->9092/tcp, [::]:9092->9092/tcp, 0.0.0.0:29092->29092/tcp, [::]:29092->29092/tcp
caas-kafka-2               confluentinc/cp-kafka:7.5.0                            "/etc/confluent/dockΓÇª"   kafka-2               2 hours ago      Up 2 hours                0.0.0.0:9096->9092/tcp, [::]:9096->9092/tcp
caas-kafka-3               confluentinc/cp-kafka:7.5.0                            "/etc/confluent/dockΓÇª"   kafka-3               2 hours ago      Up 2 hours                0.0.0.0:9094->9092/tcp, [::]:9094->9092/tcp
caas-kafka-ui              provectuslabs/kafka-ui:latest                          "/bin/sh -c 'java --ΓÇª"   kafka-ui              2 hours ago      Up 2 hours                0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp
caas-media-service         caas-media-service                                     "docker-entrypoint.sΓÇª"   media-service         36 minutes ago   Up 36 minutes (healthy)   0.0.0.0:3005->3005/tcp, [::]:3005->3005/tcp
caas-minio                 minio/minio:latest                                     "/usr/bin/docker-entΓÇª"   minio                 2 hours ago      Up 2 hours (healthy)      0.0.0.0:9000-9001->9000-9001/tcp, [::]:9000-9001->9000-9001/tcp
caas-mongo-express         mongo-express:latest                                   "/sbin/tini -- /dockΓÇª"   mongo-express         2 hours ago      Up 2 hours                0.0.0.0:8082->8081/tcp, [::]:8082->8081/tcp
caas-mongodb-primary       mongo:7.0                                              "bash -c 'mkdir -p /ΓÇª"   mongodb-primary       2 hours ago      Up 2 hours (healthy)      0.0.0.0:27017->27017/tcp, [::]:27017->27017/tcp
caas-mongodb-secondary-1   mongo:7.0                                              "bash -c 'mkdir -p /ΓÇª"   mongodb-secondary-1   2 hours ago      Up 2 hours                27017/tcp
caas-mongodb-secondary-2   mongo:7.0                                              "bash -c 'mkdir -p /ΓÇª"   mongodb-secondary-2   2 hours ago      Up 2 hours                27017/tcp
caas-redis-commander       rediscommander/redis-commander:latest                  "/usr/bin/dumb-init ΓÇª"   redis-commander       2 hours ago      Up 2 hours (healthy)      0.0.0.0:8083->8081/tcp, [::]:8083->8081/tcp
caas-redis-compliance      redis:7-alpine                                         "docker-entrypoint.sΓÇª"   redis-compliance      2 hours ago      Up 2 hours (healthy)      0.0.0.0:6382->6379/tcp, [::]:6382->6379/tcp
caas-redis-crypto          redis:7-alpine                                         "docker-entrypoint.sΓÇª"   redis-crypto          2 hours ago      Up 2 hours (healthy)      0.0.0.0:6383->6379/tcp, [::]:6383->6379/tcp
caas-redis-gateway         redis:7-alpine                                         "docker-entrypoint.sΓÇª"   redis-gateway         2 hours ago      Up 2 hours (healthy)      0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
caas-redis-shared          redis:7-alpine                                         "docker-entrypoint.sΓÇª"   redis-shared          2 hours ago      Up 2 hours (healthy)      0.0.0.0:6381->6379/tcp, [::]:6381->6379/tcp
caas-redis-socket          redis:7-alpine                                         "docker-entrypoint.sΓÇª"   redis-socket          2 hours ago      Up 2 hours (healthy)      0.0.0.0:6380->6379/tcp, [::]:6380->6379/tcp
caas-schema-registry       confluentinc/cp-schema-registry:7.5.0                  "/etc/confluent/dockΓÇª"   schema-registry       2 hours ago      Up 2 hours (healthy)      0.0.0.0:8081->8081/tcp, [::]:8081->8081/tcp
caas-search-service        caas-search-service                                    "docker-entrypoint.sΓÇª"   search-service        36 minutes ago   Up 36 minutes (healthy)   0.0.0.0:3006->3006/tcp, [::]:3006->3006/tcp
caas-socket-1              caas-socket-service-1                                  "dumb-init -- node dΓÇª"   socket-service-1      17 minutes ago   Up 17 minutes (healthy)   0.0.0.0:3002->3001/tcp, [::]:3002->3001/tcp
caas-socket-2              caas-socket-service-2                                  "dumb-init -- node dΓÇª"   socket-service-2      17 minutes ago   Up 17 minutes (healthy)   0.0.0.0:3003->3001/tcp, [::]:3003->3001/tcp
caas-zookeeper             confluentinc/cp-zookeeper:7.5.0                        "/etc/confluent/dockΓÇª"   zookeeper             2 hours ago      Up 2 hours (healthy)      0.0.0.0:2181->2181/tcp, [::]:2181->2181/tcp
```

## Runner Console Output
```text
[Phase 1] infrastructure-health...
[Phase 2] tenant-onboarding...
[Phase 3] api-key-lifecycle...
[Phase 4] sdk-session-lifecycle...
[Phase 5] token-validation...
[Phase 5.5] token-refresh...
[Phase 6] gateway-routing...
[Phase 7] cross-service...
[Phase 8] socket-realtime...
[Phase 9] security-isolation...
[Phase 10] swagger-discovery...
[Phase 11] session-logout...

Full System Test report written: /tests/reports/full-system-raw-20260225-022033.json
Summary: total=125 passed=116 warnings=9 failed=0
```

## Detailed Test Cases

### [1] [PASS] Gateway Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 168ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "54",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "9b04cd47-7335-4e87-a801-8981583a4642",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "99",
                    "x-ratelimit-reset":  "1771966319",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"status\":\"ok\",\"timestamp\":\"2026-02-24T20:50:59.223Z\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [2] [PASS] Gateway Internal Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 16ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/internal/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "103",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "df8222b0-0343-4de7-9f5f-a456b750cefb",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "98",
                    "x-ratelimit-reset":  "1771966319",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"status\":\"ok\",\"service\":\"caas-gateway\",\"timestamp\":\"2026-02-24T20:50:59.258Z\",\"uptime\":2217.560286994}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [3] [PASS] Gateway Ready Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 84ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/internal/ready",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "142",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "b4724dc3-fdaa-4c84-a6b7-dcd2c626977c",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "97",
                    "x-ratelimit-reset":  "1771966319",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"status\":\"healthy\",\"service\":\"caas-gateway\",\"timestamp\":\"2026-02-24T20:50:59.343Z\",\"dependencies\":{\"mongodb\":\"up\",\"redis\":\"up\",\"kafka\":\"up\"}}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [4] [PASS] Auth Service Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 8ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://auth-service:3001/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "108",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "e385366c-3b3b-492e-967a-c904bc8c3016",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9999",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"status\":\"healthy\",\"service\":\"auth-service\",\"timestamp\":\"2026-02-24T20:50:59.350Z\",\"uptime\":1201.116980034}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/session"
    ip: "172.28.6.1"
    userAgent: "axios/1.13.5"
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3k"
    res: {
      "statusCode": 401
    }
    responseTime: 8.730811983346939
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-3l"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/sdk/session",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.6.1",
      "remotePort": 43328
    }
[20:51:00 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3l"
    method: "POST"
    url: "/api/v1/auth/sdk/session"
    ip: "172.28.6.1"
    userAgent: "axios/1.13.5"
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3l"
    res: {
      "statusCode": 401
    }
    responseTime: 5.017036974430084
```

---

### [5] [PASS] Compliance Service Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://compliance-service:3008/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "143",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "1fad05ec-5b61-45b4-9706-7cf28befa905",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "96",
                    "x-ratelimit-reset":  "2583",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"status\":\"healthy\",\"service\":\"compliance-service\",\"timestamp\":\"2026-02-24T20:50:59.360Z\",\"checks\":{\"mongodb\":\"connected\",\"redis\":\"connected\"}}",
    "error":  null
}
```

**Service Logs:**
caas-compliance-service:
```text
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9l"
    req: {
      "method": "POST",
      "url": "/api/v1/audit/log",
      "hostname": "compliance-service:3008",
      "remoteAddress": "172.28.0.5",
      "remotePort": 48344
    }
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9l"
    res: {
      "statusCode": 201
    }
    responseTime: 65.92737099528313
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9m"
    req: {
      "method": "POST",
      "url": "/api/v1/audit/log",
      "hostname": "compliance-service:3008",
      "remoteAddress": "172.28.0.5",
      "remotePort": 48356
    }
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9m"
    res: {
      "statusCode": 400
    }
    responseTime: 1.4177000224590302
```

---

### [6] [PASS] Crypto Service Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://crypto-service:3009/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "139",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "18ab067d-a94b-4599-8b8b-2da03acc61bd",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "1000",
                    "x-ratelimit-remaining":  "994",
                    "x-ratelimit-reset":  "2583",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"status\":\"healthy\",\"service\":\"crypto-service\",\"timestamp\":\"2026-02-24T20:50:59.371Z\",\"checks\":{\"mongodb\":\"connected\",\"redis\":\"connected\"}}",
    "error":  null
}
```

**Service Logs:**
caas-crypto-service:
```text
[20:50:57 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9e"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "127.0.0.1:3009",
      "remoteAddress": "127.0.0.1",
      "remotePort": 34016
    }
[20:50:57 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9e"
    res: {
      "statusCode": 200
    }
    responseTime: 2.1999030113220215
[20:50:59 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9f"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "crypto-service:3009",
      "remoteAddress": "172.28.0.5",
      "remotePort": 33214
    }
[20:50:59 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9f"
    res: {
      "statusCode": 200
    }
    responseTime: 5.175150990486145
```

---

### [7] [PASS] Search Service Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 7ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://search-service:3006/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "connection":  "keep-alive",
                    "content-length":  "192",
                    "content-type":  "application/json; charset=utf-8",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "x-correlation-id":  "5eed201e-51eb-45bb-ab51-91cefe654485"
                },
    "body":  "{\"status\":\"healthy\",\"service\":\"search-service\",\"indexing\":{\"documentsIndexed\":0,\"documentsUpdated\":0,\"documentsDeleted\":0,\"errors\":0,\"lastFlush\":\"2026-02-24T20:13:57.891Z\",\"averageLatency\":0}}",
    "error":  null
}
```

**Service Logs:**
caas-search-service:
```text
{"level":30,"time":1771966259378,"pid":1,"hostname":"671bb33a4867","reqId":"req-27","req":{"method":"GET","url":"/health","hostname":"search-service:3006","remoteAddress":"172.28.0.5","remotePort":51472},"msg":"incoming request"}
{"level":30,"time":1771966259379,"pid":1,"hostname":"671bb33a4867","reqId":"req-27","res":{"statusCode":200},"responseTime":0.48914602398872375,"msg":"request completed"}
{"level":30,"time":1771966261016,"pid":1,"hostname":"671bb33a4867","reqId":"req-28","req":{"method":"POST","url":"/api/v1/search/messages","hostname":"search-service:3006","remoteAddress":"172.28.0.5","remotePort":51472},"msg":"incoming request"}
{"level":30,"time":1771966261024,"pid":1,"hostname":"671bb33a4867","reqId":"req-28","msg":"Route POST:/api/v1/search/messages not found"}
{"level":30,"time":1771966261025,"pid":1,"hostname":"671bb33a4867","reqId":"req-28","res":{"statusCode":404},"responseTime":8.898980021476746,"msg":"request completed"}
```

---

### [8] [PASS] Media Service Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://media-service:3005/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "151",
                    "content-type":  "application/json; charset=utf-8",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "x-correlation-id":  "7ac5c37a-b342-4d86-b7f7-ef25ba982a87"
                },
    "body":  "{\"status\":\"healthy\",\"timestamp\":\"2026-02-24T20:50:59.387Z\",\"services\":{\"mongodb\":\"connected\",\"s3\":\"connected\",\"redis\":\"connected\",\"kafka\":\"connected\"}}",
    "error":  null
}
```

**Service Logs:**
caas-media-service:
```text
{"level":30,"time":1771966259385,"pid":1,"hostname":"303ca3db3c29","reqId":"req-27","req":{"method":"GET","url":"/health","hostname":"media-service:3005","remoteAddress":"172.28.0.5","remotePort":45172},"msg":"incoming request"}
{"level":30,"time":1771966259388,"pid":1,"hostname":"303ca3db3c29","reqId":"req-27","res":{"statusCode":200},"responseTime":2.2623089849948883,"msg":"request completed"}
{"level":30,"time":1771966261116,"pid":1,"hostname":"303ca3db3c29","reqId":"req-28","req":{"method":"GET","url":"/api/v1/media/quota","hostname":"media-service:3005","remoteAddress":"172.28.0.5","remotePort":45172},"msg":"incoming request"}
{"level":30,"time":1771966261116,"pid":1,"hostname":"303ca3db3c29","reqId":"req-28","msg":"Route GET:/api/v1/media/quota not found"}
{"level":30,"time":1771966261118,"pid":1,"hostname":"303ca3db3c29","reqId":"req-28","res":{"statusCode":404},"responseTime":1.5273660123348236,"msg":"request completed"}
```

---

### [9] [PASS] Socket Service 1 Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://socket-service-1:3001/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "connection":  "keep-alive",
                    "content-length":  "245",
                    "content-type":  "application/json; charset=utf-8",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "etag":  "W/\"f5-55YHP6bikzxo4qm/9u3c12SnQP4\"",
                    "keep-alive":  "timeout=5",
                    "x-powered-by":  "Express"
                },
    "body":  "{\"status\":\"healthy\",\"timestamp\":\"2026-02-24T20:50:59.397Z\",\"checks\":{\"redis\":{\"status\":\"healthy\",\"latency_ms\":0},\"memory\":{\"status\":\"healthy\"},\"uptime\":{\"status\":\"healthy\"}},\"metrics\":{\"connections\":0,\"uptime_seconds\":1082,\"memory_usage_mb\":26}}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [10] [PASS] Socket Service 2 Health
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 7ms
- **Tags:** health

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://socket-service-2:3001/health",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "connection":  "keep-alive",
                    "content-length":  "245",
                    "content-type":  "application/json; charset=utf-8",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "etag":  "W/\"f5-Clu40HgNKpv4joigebYiDwM4iP8\"",
                    "keep-alive":  "timeout=5",
                    "x-powered-by":  "Express"
                },
    "body":  "{\"status\":\"healthy\",\"timestamp\":\"2026-02-24T20:50:59.405Z\",\"checks\":{\"redis\":{\"status\":\"healthy\",\"latency_ms\":1},\"memory\":{\"status\":\"healthy\"},\"uptime\":{\"status\":\"healthy\"}},\"metrics\":{\"connections\":0,\"uptime_seconds\":1082,\"memory_usage_mb\":25}}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [11] [PASS] Gateway Ping
- **Type:** http
- **Phase:** 1
- **Outcome:** passed
- **Duration:** 8ms
- **Tags:** health, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/ping",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "26",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "becea363-d43a-4071-aadd-5a3bcae03a1d",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "96",
                    "x-ratelimit-reset":  "1771966319",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"message\":\"pong from v1\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [12] [PASS] Register Tenant A (Business)
- **Type:** http
- **Phase:** 2
- **Outcome:** passed
- **Duration:** 455ms
- **Tags:** auth, registration

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/register",
    "headers":  {

                },
    "body":  "{\"company_name\":\"SystemTest Corp 1771966259071\",\"email\":\"admin-1771966259071@systemtest.com\",\"password\":\"SystemTest1234!@#$\",\"plan\":\"business\"}",
    "acceptableStatus":  [
                             200,
                             201
                         ]
}
```

**Response:**
```json
{
    "status":  201,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "380",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:50:59 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "85557592-e9bd-4776-ae5e-933e933bf980",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9998",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"client_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"api_key\":\"caas_prod_614ee4cf2d53340528021137d9c05bf222709d45c3407268d730381d5374dcb6\",\"api_secret\":\"caas_prod_19429bc1c4cf1cb2695604518e33519529f8c75db568804a1f357f8db13294ee\",\"message\":\"Registration successful. Store your API keys securely - they cannot be retrieved later.\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [13] [PASS] Register Tenant B (Free)
- **Type:** http
- **Phase:** 2
- **Outcome:** passed
- **Duration:** 330ms
- **Tags:** auth, registration

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/register",
    "headers":  {

                },
    "body":  "{\"company_name\":\"SystemTest Rival 1771966259071\",\"email\":\"rival-1771966259071@systemtest.com\",\"password\":\"RivalTest1234!@#$\",\"plan\":\"free\"}",
    "acceptableStatus":  [
                             200,
                             201
                         ]
}
```

**Response:**
```json
{
    "status":  201,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "380",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "77139d26-5c84-43c9-b3a2-7acd000d38dd",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9997",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"client_id\":\"978f42af-4203-4233-896d-9bb21c96e2c7\",\"tenant_id\":\"829fca6c-6975-45d8-82c0-d62317a2003a\",\"api_key\":\"caas_prod_d9ae5135ca183210df735c6e1a1b5af0008ab47b3bb5ba268e4c2bf4128e3c54\",\"api_secret\":\"caas_prod_b1ae10b86563c1f5bfc21537603db466e08b63ffbfa17422434c8fb31d8fe166\",\"message\":\"Registration successful. Store your API keys securely - they cannot be retrieved later.\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [14] [PASS] Duplicate Registration (should fail)
- **Type:** http
- **Phase:** 2
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** auth, registration, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/register",
    "headers":  {

                },
    "body":  "{\"company_name\":\"SystemTest Corp 1771966259071\",\"email\":\"admin-1771966259071@systemtest.com\",\"password\":\"SystemTest1234!@#$\"}",
    "acceptableStatus":  [
                             400,
                             409,
                             422
                         ]
}
```

**Response:**
```json
{
    "status":  409,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "36",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "490eaa4c-46c3-4594-b561-3fe4d4945615",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9996",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Email already registered\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [15] [PASS] Rotate API Key (Tenant A)
- **Type:** http
- **Phase:** 3
- **Outcome:** passed
- **Duration:** 21ms
- **Tags:** auth, apikey

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/api-keys/rotate",
    "headers":  {
                    "x-service-secret":  "dev-service-secret-change-in-production"
                },
    "body":  "{\"client_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "180",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "fbcd804d-d81d-4511-915c-e88217155200",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9995",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"secondary_key\":\"caas_prod_2511ad77e2415326dce3b3a725b6a07849cc1c9ad70b88a66c7eff291f45aebb\",\"message\":\"New secondary key generated. Update your application and then promote it.\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [16] [PASS] Promote API Key (Tenant A)
- **Type:** http
- **Phase:** 3
- **Outcome:** passed
- **Duration:** 15ms
- **Tags:** auth, apikey

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/api-keys/promote",
    "headers":  {
                    "x-service-secret":  "dev-service-secret-change-in-production"
                },
    "body":  "{\"client_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "73",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "47b36cf2-f4c6-41ed-a27e-6f1d7bc325cf",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9994",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"message\":\"Secondary key promoted to primary. Old primary key revoked.\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [17] [PASS] Validate API Key (Internal)
- **Type:** http
- **Phase:** 3
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** auth, internal

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/internal/validate-api-key",
    "headers":  {
                    "x-service-secret":  "dev-service-secret-change-in-production"
                },
    "body":  "{\"api_key\":\"caas_prod_2511ad77e2415326dce3b3a725b6a07849cc1c9ad70b88a66c7eff291f45aebb\",\"ip_address\":\"127.0.0.1\"}",
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "415",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "a3cb43ca-8f5f-4ef2-aaa6-93f5b042925a",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9993",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"valid\":true,\"client\":{\"client_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"plan\":\"business\",\"permissions\":[\"sdk:session:create\",\"sdk:session:refresh\",\"sdk:session:logout\",\"user:read\",\"user:write\",\"conversation:read\",\"conversation:write\",\"message:read\",\"message:write\",\"media:upload\",\"media:download\",\"search:query\",\"analytics:read\"],\"rate_limit_tier\":\"business\"}}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [18] [PASS] Validate Invalid API Key
- **Type:** http
- **Phase:** 3
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** auth, internal, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/internal/validate-api-key",
    "headers":  {
                    "x-service-secret":  "dev-service-secret-change-in-production"
                },
    "body":  "{\"api_key\":\"caas_fake_key_999\",\"ip_address\":\"127.0.0.1\"}",
    "acceptableStatus":  [
                             401,
                             403,
                             404
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "41",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "5a4ac75c-3398-450f-8f6d-11ad46e2ffc3",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9992",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"valid\":false,\"error\":\"Invalid API key\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [19] [PASS] Validate API Key (No Service Secret)
- **Type:** http
- **Phase:** 3
- **Outcome:** passed
- **Duration:** 4ms
- **Tags:** auth, internal, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/internal/validate-api-key",
    "headers":  {

                },
    "body":  "{\"api_key\":\"caas_prod_2511ad77e2415326dce3b3a725b6a07849cc1c9ad70b88a66c7eff291f45aebb\",\"ip_address\":\"127.0.0.1\"}",
    "acceptableStatus":  [
                             401,
                             403
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "68",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "98b610c7-c910-4e27-9864-c0d3ea92fde7",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9991",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Authentication failed: Invalid or missing service secret\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [20] [PASS] Create SDK Session — Alice (Tenant A)
- **Type:** http
- **Phase:** 4
- **Outcome:** passed
- **Duration:** 142ms
- **Tags:** auth, sdk, session

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/sdk/session",
    "headers":  {
                    "x-api-key":  "caas_prod_2511ad77e2415326dce3b3a725b6a07849cc1c9ad70b88a66c7eff291f45aebb"
                },
    "body":  "{\"user_external_id\":\"alice-1771966259071\",\"user_data\":{\"name\":\"Alice Tester\",\"email\":\"alice-1771966259071@test.com\"},\"device_info\":{\"device_type\":\"web\"}}",
    "acceptableStatus":  [
                             200,
                             201
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "1255",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "e9a02f1e-b33d-455f-88a9-9b3e490c460a",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9990",
                    "x-ratelimit-reset":  "900",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"access_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YjBmYzUzNC03MDA0LTRjZjUtYjZkYS0yM2Y1MDJkZDVkMTkiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwiZXh0ZXJuYWxfaWQiOiJhbGljZS0xNzcxOTY2MjU5MDcxIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.HIvo1gAVAyvcpOGZtNUxWWwWtPoRI-sA_whXtYK5NCA\",\"refresh_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMWI0ZWY4My1iNDVkLTQ0NjUtYTAyMy05OTk1YWZkZTI1MTQiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzcxOTY2MjYwLCJleHAiOjE3NzI1NzEwNjAsImlzcyI6ImNhYXMtYXV0aC1zZXJ2aWNlIn0.4IsbkNfnLQoEetBp55RyDlmMuUWTdcR8VpM7ISD6vJg\",\"expires_in\":900,\"token_type\":\"Bearer\",\"user\":{\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"external_id\":\"alice-1771966259071\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\"},\"socket_urls\":[\"ws://localhost:3001\"]}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [21] [PASS] Create SDK Session — Bob (Tenant A)
- **Type:** http
- **Phase:** 4
- **Outcome:** passed
- **Duration:** 93ms
- **Tags:** auth, sdk, session

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/sdk/session",
    "headers":  {
                    "x-api-key":  "caas_prod_2511ad77e2415326dce3b3a725b6a07849cc1c9ad70b88a66c7eff291f45aebb"
                },
    "body":  "{\"user_external_id\":\"bob-1771966259071\",\"user_data\":{\"name\":\"Bob Tester\",\"email\":\"bob-1771966259071@test.com\"},\"device_info\":{\"device_type\":\"mobile\"}}",
    "acceptableStatus":  [
                             200,
                             201
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "1247",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "75f0b1c9-3c68-4361-9742-06e656b34068",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9989",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"access_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjNmE4NzgwNC1hOTgzLTQ2YjItOWY4Mi1kNjE2OWZkNmQxMTQiLCJ1c2VyX2lkIjoiYTFmMjI5YTctZWNmMS00NzcyLWJlNzMtNTE4NjhkMTQzYWZkIiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJib2ItMTc3MTk2NjI1OTA3MUB0ZXN0LmNvbSIsImV4dGVybmFsX2lkIjoiYm9iLTE3NzE5NjYyNTkwNzEiLCJzZXNzaW9uX2lkIjoiYTdmYTE4NzYtNWVhMC00NDAzLTlhMmUtNDZlYWY3YjcwMGI2IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MTk2NjI2MCwiZXhwIjoxNzcxOTY3MTYwLCJpc3MiOiJjYWFzLWF1dGgtc2VydmljZSJ9.CKrUUxZk_2G7d4MNkqALrjGWJ54l5Sb_feQgX2F22Xk\",\"refresh_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzNWY4MzcxNC0wNTdkLTQzNDQtOTIyZS1iYWFiODVjMGE1MzYiLCJ1c2VyX2lkIjoiYTFmMjI5YTctZWNmMS00NzcyLWJlNzMtNTE4NjhkMTQzYWZkIiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwic2Vzc2lvbl9pZCI6ImE3ZmExODc2LTVlYTAtNDQwMy05YTJlLTQ2ZWFmN2I3MDBiNiIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzcxOTY2MjYwLCJleHAiOjE3NzI1NzEwNjAsImlzcyI6ImNhYXMtYXV0aC1zZXJ2aWNlIn0.biYYo__NwEJP_M5gnkYNo2QEY8aBezLm7EL0JjtNw3A\",\"expires_in\":900,\"token_type\":\"Bearer\",\"user\":{\"user_id\":\"a1f229a7-ecf1-4772-be73-51868d143afd\",\"external_id\":\"bob-1771966259071\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\"},\"socket_urls\":[\"ws://localhost:3001\"]}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [22] [PASS] Create SDK Session — Charlie (Tenant B)
- **Type:** http
- **Phase:** 4
- **Outcome:** passed
- **Duration:** 106ms
- **Tags:** auth, sdk, session

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/sdk/session",
    "headers":  {
                    "x-api-key":  "caas_prod_d9ae5135ca183210df735c6e1a1b5af0008ab47b3bb5ba268e4c2bf4128e3c54"
                },
    "body":  "{\"user_external_id\":\"charlie-1771966259071\",\"user_data\":{\"name\":\"Charlie Rival\"},\"device_info\":{\"device_type\":\"web\"}}",
    "acceptableStatus":  [
                             200,
                             201
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "1315",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "6f94411f-572f-43a1-bd45-a0b369203a84",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9988",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"access_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOTA2MTg5Zi0zNzE1LTQwYzItOWNhNi01OGNjOTdiNjJkZGMiLCJ1c2VyX2lkIjoiYzAyM2NjYTEtOTE3MS00NWU5LTg1MTgtZDE0YzMyZTA3Yjk5IiwidGVuYW50X2lkIjoiODI5ZmNhNmMtNjk3NS00NWQ4LTgyYzAtZDYyMzE3YTIwMDNhIiwiZW1haWwiOiJjaGFybGllLTE3NzE5NjYyNTkwNzFAc2RrLjgyOWZjYTZjLTY5NzUtNDVkOC04MmMwLWQ2MjMxN2EyMDAzYS5jYWFzLmlvIiwiZXh0ZXJuYWxfaWQiOiJjaGFybGllLTE3NzE5NjYyNTkwNzEiLCJzZXNzaW9uX2lkIjoiNmY5YzQ4YWUtZDY4ZC00M2M2LWIwY2ItYmFmZTBlNmVhZGVjIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MTk2NjI2MCwiZXhwIjoxNzcxOTY3MTYwLCJpc3MiOiJjYWFzLWF1dGgtc2VydmljZSJ9.0ulJXhWmU_PIFDGk1cUslxPp0sTMamIxsUNpgNSp4eU\",\"refresh_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1ZjU5MGJiMy1iODRkLTQwYmYtYjA5Yy1lYzFjMjcwZGZhODgiLCJ1c2VyX2lkIjoiYzAyM2NjYTEtOTE3MS00NWU5LTg1MTgtZDE0YzMyZTA3Yjk5IiwidGVuYW50X2lkIjoiODI5ZmNhNmMtNjk3NS00NWQ4LTgyYzAtZDYyMzE3YTIwMDNhIiwic2Vzc2lvbl9pZCI6IjZmOWM0OGFlLWQ2OGQtNDNjNi1iMGNiLWJhZmUwZTZlYWRlYyIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzcxOTY2MjYwLCJleHAiOjE3NzI1NzEwNjAsImlzcyI6ImNhYXMtYXV0aC1zZXJ2aWNlIn0.-Odwom3NOxhPRONaH9Nd8Bdjq1adyXoqjc9aK9LBVTQ\",\"expires_in\":900,\"token_type\":\"Bearer\",\"user\":{\"user_id\":\"c023cca1-9171-45e9-8518-d14c32e07b99\",\"external_id\":\"charlie-1771966259071\",\"tenant_id\":\"829fca6c-6975-45d8-82c0-d62317a2003a\"},\"socket_urls\":[\"ws://localhost:3001\"]}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [23] [PASS] Create Session (No API Key — should fail)
- **Type:** http
- **Phase:** 4
- **Outcome:** passed
- **Duration:** 3ms
- **Tags:** auth, sdk, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/sdk/session",
    "headers":  {

                },
    "body":  "{\"user_external_id\":\"should-fail\"}",
    "acceptableStatus":  [
                             401,
                             403
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "51",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "2b9d88ce-430b-4cb7-8088-63e0d5b45612",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9987",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"API key is required in x-api-key header\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [24] [PASS] Validate Token — Alice (Internal)
- **Type:** http
- **Phase:** 5
- **Outcome:** passed
- **Duration:** 8ms
- **Tags:** auth, internal

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/internal/validate",
    "headers":  {
                    "x-service-secret":  "dev-service-secret-change-in-production"
                },
    "body":  "{\"token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YjBmYzUzNC03MDA0LTRjZjUtYjZkYS0yM2Y1MDJkZDVkMTkiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwiZXh0ZXJuYWxfaWQiOiJhbGljZS0xNzcxOTY2MjU5MDcxIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.HIvo1gAVAyvcpOGZtNUxWWwWtPoRI-sA_whXtYK5NCA\"}",
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "287",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "ad7a7473-a169-4fb1-9bb2-abd64950eefc",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9986",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"valid\":true,\"payload\":{\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"external_id\":\"alice-1771966259071\",\"permissions\":[],\"session_id\":\"2bb1eb5c-866d-41a3-bf7b-e0a546582152\",\"exp\":1771967160,\"email\":\"alice-1771966259071@test.com\"}}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [25] [PASS] Validate Token — Alice (Public)
- **Type:** http
- **Phase:** 5
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** auth

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/validate",
    "headers":  {

                },
    "body":  "{\"token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YjBmYzUzNC03MDA0LTRjZjUtYjZkYS0yM2Y1MDJkZDVkMTkiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwiZXh0ZXJuYWxfaWQiOiJhbGljZS0xNzcxOTY2MjU5MDcxIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.HIvo1gAVAyvcpOGZtNUxWWwWtPoRI-sA_whXtYK5NCA\"}",
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "760",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "7b28b955-1dcb-4264-bee3-a3dd0cadb779",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9985",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"valid\":true,\"payload\":{\"jti\":\"5b0fc534-7004-4cf5-b6da-23f502dd5d19\",\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"email\":\"alice-1771966259071@test.com\",\"external_id\":\"alice-1771966259071\",\"session_id\":\"2bb1eb5c-866d-41a3-bf7b-e0a546582152\",\"type\":\"access\",\"iat\":1771966260,\"exp\":1771967160,\"iss\":\"caas-auth-service\"},\"session\":{\"session_id\":\"2bb1eb5c-866d-41a3-bf7b-e0a546582152\",\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"ip_address\":\"172.28.0.5\",\"user_agent\":\"node\",\"is_active\":true,\"expires_at\":\"2026-02-25T20:51:00.387Z\",\"created_at\":\"2026-02-24T20:51:00.388Z\",\"last_activity_at\":\"2026-02-24T20:51:00.388Z\",\"_id\":\"699e0f349f7a18130ba0c6d6\"}}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [26] [PASS] Validate Bogus Token
- **Type:** http
- **Phase:** 5
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** auth, internal, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/internal/validate",
    "headers":  {
                    "x-service-secret":  "dev-service-secret-change-in-production"
                },
    "body":  "{\"token\":\"eyJhbGciOiJIUzI1NiJ9.e30.bogus\"}",
    "acceptableStatus":  [
                             401,
                             403
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "39",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "bffdb087-1516-445d-96a5-5b5c2a1582df",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9984",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"valid\":false,\"error\":\"Invalid token\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [27] [PASS] Refresh Token — Alice
- **Type:** http
- **Phase:** 5.5
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** auth, sdk

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/sdk/refresh",
    "headers":  {

                },
    "body":  "{\"refresh_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMWI0ZWY4My1iNDVkLTQ0NjUtYTAyMy05OTk1YWZkZTI1MTQiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzcxOTY2MjYwLCJleHAiOjE3NzI1NzEwNjAsImlzcyI6ImNhYXMtYXV0aC1zZXJ2aWNlIn0.4IsbkNfnLQoEetBp55RyDlmMuUWTdcR8VpM7ISD6vJg\"}",
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "1024",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "dd11bb65-124e-4716-ac22-d9c8fae9edd4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9983",
                    "x-ratelimit-reset":  "899",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"access_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A\",\"refresh_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NmUzNzc1Ni0wZTJjLTQwN2YtOTgzNy03MGVhYWMyNWQ5Y2UiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzcxOTY2MjYwLCJleHAiOjE3NzI1NzEwNjAsImlzcyI6ImNhYXMtYXV0aC1zZXJ2aWNlIn0.ENE7C0FUsbf1jyzq9NJE0GtisRehXGngXkSRLu1IcRs\",\"expires_in\":900,\"token_type\":\"Bearer\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [28] [PASS] Tenant Info (No Auth)
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 18ms
- **Tags:** gateway, negative

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/tenant",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             401,
                             403
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "70",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "8c72b20f-24cf-4ac2-a0ba-97a44adc0206",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "95",
                    "x-ratelimit-reset":  "1771966319",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":401,\"error\":\"Error\",\"message\":\"Tenant context required\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [29] [PASS] Tenant Info
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 49ms
- **Tags:** gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/tenant",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "e09f9482-6cbd-46f1-96f3-b107432614a4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "94",
                    "x-ratelimit-reset":  "59",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [30] [PASS] Tenant Usage
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/tenant/usage",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "968c43c9-edb9-4888-a2e9-15939b84f9b4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "93",
                    "x-ratelimit-reset":  "59",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [31] [PASS] Update Tenant Settings
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 26ms
- **Tags:** gateway

**Request:**
```json
{
    "method":  "PUT",
    "url":  "http://gateway:3000/v1/tenant/settings",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "{\"settings\":{\"locale\":\"en\",\"timezone\":\"UTC\"}}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "f2845605-d8f7-4745-9e38-afb49b904f5e",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "92",
                    "x-ratelimit-reset":  "59",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [32] [PASS] Gateway Create API Key
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 20ms
- **Tags:** gateway, auth

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/auth/api-keys",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "{\"name\":\"system-test-key\",\"scopes\":[\"read\"]}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "3e64a0d5-f036-49e6-b99f-8ca35621cca0",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "91",
                    "x-ratelimit-reset":  "59",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [33] [PASS] Gateway List API Keys
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 13ms
- **Tags:** gateway, auth

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/auth/api-keys",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "2275360d-ccea-46d5-822f-851b1e3a1215",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "90",
                    "x-ratelimit-reset":  "59",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [34] [PASS] Gateway Sessions List
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** gateway, sessions

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/sessions",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "9ed77bc5-0d3b-4ae3-8e74-ce03e006dbe4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "89",
                    "x-ratelimit-reset":  "59",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [35] [PASS] Gateway SDK Token (Legacy)
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 33ms
- **Tags:** auth, gateway, sdk

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/auth/sdk/token",
    "headers":  {

                },
    "body":  "{\"app_id\":\"default-tenant\",\"app_secret\":\"secret\",\"user_external_id\":\"sdk-1771966259071\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "82",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "ec6ce0ab-5d9c-42a8-b5e7-938a28b932c3",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "94",
                    "x-ratelimit-reset":  "1771966318",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":401,\"error\":\"Error\",\"message\":\"Request failed with status code 401\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [36] [PASS] Gateway SDK Token (Bad Secret)
- **Type:** http
- **Phase:** 6
- **Outcome:** passed
- **Duration:** 17ms
- **Tags:** auth, gateway, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/auth/sdk/token",
    "headers":  {

                },
    "body":  "{\"app_id\":\"default-tenant\",\"app_secret\":\"WRONG\",\"user_external_id\":\"sdk-bad-1771966259071\"}",
    "acceptableStatus":  [
                             400,
                             401
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "82",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "3425ec07-3743-4b28-ac4f-57e2546dc6eb",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "93",
                    "x-ratelimit-reset":  "1771966318",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":401,\"error\":\"Error\",\"message\":\"Request failed with status code 401\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
              at async CircuitBreaker.execute (/services/gateway/dist/src/utils/circuit-breaker.js:44:28)
              at async Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:24:34)
      "status": 401,
      "type": "AxiosError"
    }
[20:51:00.853] [31mERROR[39m (1): [36mRequest failed with status code 401[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "3425ec07-3743-4b28-ac4f-57e2546dc6eb"
    err: {
      "type": "UnauthorizedError",
      "message": "Request failed with status code 401",
      "stack":
          Error: Request failed with status code 401
              at Object.<anonymous> (/services/gateway/dist/src/routes/v1/auth/sdk-auth.js:33:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 401,
      "code": "UNAUTHORIZED",
      "isOperational": true
    }
[20:51:00.855] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    correlationId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    statusCode: 401
    responseTime: 13.616616994142532
[20:51:00.855] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "d4b88442-841b-4a38-bb16-27d51bf07bd6"
    res: {
      "statusCode": 401
    }
    responseTime: 13.616616994142532
```

---

### [37] [PASS] Compliance — Create Audit Log
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 72ms
- **Tags:** compliance

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://compliance-service:3008/api/v1/audit/log",
    "headers":  {

                },
    "body":  "{\"tenant_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\",\"user_id\":\"alice-1771966259071\",\"action\":\"system_test\",\"resource_type\":\"system\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  201,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "51",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "ee79da94-0eb1-4252-922c-6a6854a37303",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "95",
                    "x-ratelimit-reset":  "2581",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"audit_id\":\"d91119a7-d8b0-4d18-96d8-26834be682cf\"}",
    "error":  null
}
```

**Service Logs:**
caas-compliance-service:
```text
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9l"
    req: {
      "method": "POST",
      "url": "/api/v1/audit/log",
      "hostname": "compliance-service:3008",
      "remoteAddress": "172.28.0.5",
      "remotePort": 48344
    }
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9l"
    res: {
      "statusCode": 201
    }
    responseTime: 65.92737099528313
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9m"
    req: {
      "method": "POST",
      "url": "/api/v1/audit/log",
      "hostname": "compliance-service:3008",
      "remoteAddress": "172.28.0.5",
      "remotePort": 48356
    }
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9m"
    res: {
      "statusCode": 400
    }
    responseTime: 1.4177000224590302
```

---

### [38] [PASS] Compliance — Invalid Audit Log
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** compliance, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://compliance-service:3008/api/v1/audit/log",
    "headers":  {

                },
    "body":  "{\"tenant_id\":\"\",\"action\":\"\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "35",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "c7e90245-e3b4-4a68-b06c-45f08ca72a64",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "94",
                    "x-ratelimit-reset":  "2581",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Missing required fields\"}",
    "error":  null
}
```

**Service Logs:**
caas-compliance-service:
```text
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9l"
    req: {
      "method": "POST",
      "url": "/api/v1/audit/log",
      "hostname": "compliance-service:3008",
      "remoteAddress": "172.28.0.5",
      "remotePort": 48344
    }
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9l"
    res: {
      "statusCode": 201
    }
    responseTime: 65.92737099528313
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9m"
    req: {
      "method": "POST",
      "url": "/api/v1/audit/log",
      "hostname": "compliance-service:3008",
      "remoteAddress": "172.28.0.5",
      "remotePort": 48356
    }
[20:51:00 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9m"
    res: {
      "statusCode": 400
    }
    responseTime: 1.4177000224590302
```

---

### [39] [PASS] Crypto — Generate Key
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 41ms
- **Tags:** crypto

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://crypto-service:3009/api/v1/keys/generate",
    "headers":  {

                },
    "body":  "{\"tenant_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\",\"key_type\":\"data\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  201,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "49",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "1a1cfdd7-c84d-475e-a89b-0cb3b1958895",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "1000",
                    "x-ratelimit-remaining":  "993",
                    "x-ratelimit-reset":  "2581",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"key_id\":\"d50e8ffd-afea-44fc-b76c-bb4737b219c0\"}",
    "error":  null
}
```

**Service Logs:**
caas-crypto-service:
```text
    res: {
      "statusCode": 200
    }
    responseTime: 3.1432709991931915
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9j"
    req: {
      "method": "POST",
      "url": "/api/v1/decrypt",
      "hostname": "crypto-service:3009",
      "remoteAddress": "172.28.0.5",
      "remotePort": 33224
    }
[20:51:01 UTC] [31mERROR[39m: [36mKey not found or inactive[39m
    err: {
      "type": "Error",
      "message": "Key not found or inactive",
      "stack":
          Error: Key not found or inactive
              at EncryptionService.getKey (/services/crypto-service/dist/src/services/encryption.service.js:54:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
              at async EncryptionService.decrypt (/services/crypto-service/dist/src/services/encryption.service.js:84:21)
              at async Object.<anonymous> (/services/crypto-service/dist/src/routes/crypto.routes.js:48:31)
    }
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9j"
    res: {
      "statusCode": 500
    }
    responseTime: 19.175655990839005
```

---

### [40] [PASS] Crypto — Encrypt Payload
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** crypto

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://crypto-service:3009/api/v1/encrypt",
    "headers":  {

                },
    "body":  "{\"key_id\":\"d50e8ffd-afea-44fc-b76c-bb4737b219c0\",\"plaintext\":\"Hello from system test\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "118",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "0db8b51a-10e9-48c7-a94b-db238e908cbf",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "1000",
                    "x-ratelimit-remaining":  "992",
                    "x-ratelimit-reset":  "2581",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"ciphertext\":\"BqJY75sD0MpMLg/U9pPYb5BSVRsNKg==\",\"iv\":\"oZaVZuEn9NZR6qH7AtRV9Q==\",\"authTag\":\"aTQImVBE/KjGDyU8k3Akpw==\"}",
    "error":  null
}
```

**Service Logs:**
caas-crypto-service:
```text
    res: {
      "statusCode": 200
    }
    responseTime: 3.1432709991931915
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9j"
    req: {
      "method": "POST",
      "url": "/api/v1/decrypt",
      "hostname": "crypto-service:3009",
      "remoteAddress": "172.28.0.5",
      "remotePort": 33224
    }
[20:51:01 UTC] [31mERROR[39m: [36mKey not found or inactive[39m
    err: {
      "type": "Error",
      "message": "Key not found or inactive",
      "stack":
          Error: Key not found or inactive
              at EncryptionService.getKey (/services/crypto-service/dist/src/services/encryption.service.js:54:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
              at async EncryptionService.decrypt (/services/crypto-service/dist/src/services/encryption.service.js:84:21)
              at async Object.<anonymous> (/services/crypto-service/dist/src/routes/crypto.routes.js:48:31)
    }
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9j"
    res: {
      "statusCode": 500
    }
    responseTime: 19.175655990839005
```

---

### [41] [PASS] Crypto — Decrypt Payload
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** crypto

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://crypto-service:3009/api/v1/decrypt",
    "headers":  {

                },
    "body":  "{\"key_id\":\"d50e8ffd-afea-44fc-b76c-bb4737b219c0\",\"ciphertext\":\"BqJY75sD0MpMLg/U9pPYb5BSVRsNKg==\",\"iv\":\"oZaVZuEn9NZR6qH7AtRV9Q==\",\"authTag\":\"aTQImVBE/KjGDyU8k3Akpw==\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "38",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:00 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "c1ff14b5-d66a-457c-af82-85e589623e51",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "1000",
                    "x-ratelimit-remaining":  "991",
                    "x-ratelimit-reset":  "2581",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"plaintext\":\"Hello from system test\"}",
    "error":  null
}
```

**Service Logs:**
caas-crypto-service:
```text
    res: {
      "statusCode": 200
    }
    responseTime: 3.1432709991931915
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9j"
    req: {
      "method": "POST",
      "url": "/api/v1/decrypt",
      "hostname": "crypto-service:3009",
      "remoteAddress": "172.28.0.5",
      "remotePort": 33224
    }
[20:51:01 UTC] [31mERROR[39m: [36mKey not found or inactive[39m
    err: {
      "type": "Error",
      "message": "Key not found or inactive",
      "stack":
          Error: Key not found or inactive
              at EncryptionService.getKey (/services/crypto-service/dist/src/services/encryption.service.js:54:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
              at async EncryptionService.decrypt (/services/crypto-service/dist/src/services/encryption.service.js:84:21)
              at async Object.<anonymous> (/services/crypto-service/dist/src/routes/crypto.routes.js:48:31)
    }
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9j"
    res: {
      "statusCode": 500
    }
    responseTime: 19.175655990839005
```

---

### [42] [PASS] Crypto — Decrypt with Bad Key
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 22ms
- **Tags:** crypto, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://crypto-service:3009/api/v1/decrypt",
    "headers":  {

                },
    "body":  "{\"key_id\":\"nonexistent-key\",\"ciphertext\":\"x\",\"iv\":\"x\",\"authTag\":\"x\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  500,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "37",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:01 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "0226fa90-d0cd-40f6-9470-05d7f0bf86db",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "1000",
                    "x-ratelimit-remaining":  "990",
                    "x-ratelimit-reset":  "2581",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Key not found or inactive\"}",
    "error":  null
}
```

**Service Logs:**
caas-crypto-service:
```text
    res: {
      "statusCode": 200
    }
    responseTime: 3.1432709991931915
[20:51:00 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-9j"
    req: {
      "method": "POST",
      "url": "/api/v1/decrypt",
      "hostname": "crypto-service:3009",
      "remoteAddress": "172.28.0.5",
      "remotePort": 33224
    }
[20:51:01 UTC] [31mERROR[39m: [36mKey not found or inactive[39m
    err: {
      "type": "Error",
      "message": "Key not found or inactive",
      "stack":
          Error: Key not found or inactive
              at EncryptionService.getKey (/services/crypto-service/dist/src/services/encryption.service.js:54:19)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
              at async EncryptionService.decrypt (/services/crypto-service/dist/src/services/encryption.service.js:84:21)
              at async Object.<anonymous> (/services/crypto-service/dist/src/routes/crypto.routes.js:48:31)
    }
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-9j"
    res: {
      "statusCode": 500
    }
    responseTime: 19.175655990839005
```

---

### [43] [PASS] Search — Empty Query
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** search, negative

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://search-service:3006/api/v1/search/messages",
    "headers":  {

                },
    "body":  "{\"query\":\"\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "connection":  "keep-alive",
                    "content-length":  "95",
                    "content-type":  "application/json; charset=utf-8",
                    "date":  "Tue, 24 Feb 2026 20:51:01 GMT",
                    "keep-alive":  "timeout=72",
                    "x-correlation-id":  "2c5ee49b-664e-4c0b-929f-505ac2da18b9"
                },
    "body":  "{\"message\":\"Route POST:/api/v1/search/messages not found\",\"error\":\"Not Found\",\"statusCode\":404}",
    "error":  null
}
```

**Service Logs:**
caas-search-service:
```text
{"level":30,"time":1771966259378,"pid":1,"hostname":"671bb33a4867","reqId":"req-27","req":{"method":"GET","url":"/health","hostname":"search-service:3006","remoteAddress":"172.28.0.5","remotePort":51472},"msg":"incoming request"}
{"level":30,"time":1771966259379,"pid":1,"hostname":"671bb33a4867","reqId":"req-27","res":{"statusCode":200},"responseTime":0.48914602398872375,"msg":"request completed"}
{"level":30,"time":1771966261016,"pid":1,"hostname":"671bb33a4867","reqId":"req-28","req":{"method":"POST","url":"/api/v1/search/messages","hostname":"search-service:3006","remoteAddress":"172.28.0.5","remotePort":51472},"msg":"incoming request"}
{"level":30,"time":1771966261024,"pid":1,"hostname":"671bb33a4867","reqId":"req-28","msg":"Route POST:/api/v1/search/messages not found"}
{"level":30,"time":1771966261025,"pid":1,"hostname":"671bb33a4867","reqId":"req-28","res":{"statusCode":404},"responseTime":8.898980021476746,"msg":"request completed"}
```

---

### [44] [PASS] Media — Quota (No Auth)
- **Type:** http
- **Phase:** 7
- **Outcome:** passed
- **Duration:** 92ms
- **Tags:** media, negative

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://media-service:3005/api/v1/media/quota",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "90",
                    "content-type":  "application/json; charset=utf-8",
                    "date":  "Tue, 24 Feb 2026 20:51:01 GMT",
                    "keep-alive":  "timeout=72",
                    "x-correlation-id":  "00c2d633-0f35-4f40-b4dd-4afa1a642dce"
                },
    "body":  "{\"message\":\"Route GET:/api/v1/media/quota not found\",\"error\":\"Not Found\",\"statusCode\":404}",
    "error":  null
}
```

**Service Logs:**
caas-media-service:
```text
{"level":30,"time":1771966259385,"pid":1,"hostname":"303ca3db3c29","reqId":"req-27","req":{"method":"GET","url":"/health","hostname":"media-service:3005","remoteAddress":"172.28.0.5","remotePort":45172},"msg":"incoming request"}
{"level":30,"time":1771966259388,"pid":1,"hostname":"303ca3db3c29","reqId":"req-27","res":{"statusCode":200},"responseTime":2.2623089849948883,"msg":"request completed"}
{"level":30,"time":1771966261116,"pid":1,"hostname":"303ca3db3c29","reqId":"req-28","req":{"method":"GET","url":"/api/v1/media/quota","hostname":"media-service:3005","remoteAddress":"172.28.0.5","remotePort":45172},"msg":"incoming request"}
{"level":30,"time":1771966261116,"pid":1,"hostname":"303ca3db3c29","reqId":"req-28","msg":"Route GET:/api/v1/media/quota not found"}
{"level":30,"time":1771966261118,"pid":1,"hostname":"303ca3db3c29","reqId":"req-28","res":{"statusCode":404},"responseTime":1.5273660123348236,"msg":"request completed"}
```

---

### [45] [PASS] Socket /chat joinRoom @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 82ms
- **Tags:** socket, negative

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "joinRoom",
    "payload":  {
                    "conversationId":  "conv-sys"
                },
    "withToken":  false,
    "expectConnect":  false
}
```

**Response:**
```json
{
    "connectError":  "Authentication failed: No token provided"
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":40,"time":1771966261191,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"Authentication failed: No token provided"}
{"level":30,"time":1771966261299,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: OkvraI8numor_A68AAAn)"}
{"level":30,"time":1771966261302,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261348,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966261352,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MRHv3sIquUpok9Y_AAAp)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261369,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: MRHv3sIquUpok9Y_AAAp) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966261372,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1vNMAwbpXlwvkbkOAAAr)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1vNMAwbpXlwvkbkOAAAr (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261388,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [46] [PASS] Socket /chat joinRoom @ socket-service-2:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 28ms
- **Tags:** socket, negative

**Request:**
```json
{
    "socketUrl":  "http://socket-service-2:3001",
    "namespace":  "/chat",
    "event":  "joinRoom",
    "payload":  {
                    "conversationId":  "conv-sys"
                },
    "withToken":  false,
    "expectConnect":  false
}
```

**Response:**
```json
{
    "connectError":  "Authentication failed: No token provided"
}
```

**Service Logs:**
caas-socket-2:
```text
{"level":40,"time":1771966261223,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"Authentication failed: No token provided"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [47] [PASS] Socket /chat joinRoom @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 123ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "joinRoom",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "User is not a member of this conversation"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":40,"time":1771966261191,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"Authentication failed: No token provided"}
{"level":30,"time":1771966261299,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: OkvraI8numor_A68AAAn)"}
{"level":30,"time":1771966261302,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261348,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966261352,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MRHv3sIquUpok9Y_AAAp)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261369,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: MRHv3sIquUpok9Y_AAAp) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966261372,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1vNMAwbpXlwvkbkOAAAr)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1vNMAwbpXlwvkbkOAAAr (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261388,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [48] [PASS] Socket /chat sendMessage @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 20ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "sendMessage",
    "payload":  {
                    "conversationId":  "conv-system-room",
                    "messageContent":  "System test message from Alice"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "Not a member of this room"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":40,"time":1771966261191,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"Authentication failed: No token provided"}
{"level":30,"time":1771966261299,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: OkvraI8numor_A68AAAn)"}
{"level":30,"time":1771966261302,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261348,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966261352,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MRHv3sIquUpok9Y_AAAp)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261369,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: MRHv3sIquUpok9Y_AAAp) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966261372,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1vNMAwbpXlwvkbkOAAAr)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1vNMAwbpXlwvkbkOAAAr (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261388,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [49] [WARN] Socket /chat typing_start @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 4019ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "typing_start",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  true,
    "data":  null
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":40,"time":1771966261191,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"Authentication failed: No token provided"}
{"level":30,"time":1771966261299,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: OkvraI8numor_A68AAAn)"}
{"level":30,"time":1771966261302,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261348,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966261352,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: OkvraI8numor_A68AAAn (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MRHv3sIquUpok9Y_AAAp)"}
{"level":30,"time":1771966261366,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261369,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: MRHv3sIquUpok9Y_AAAp) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966261372,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: MRHv3sIquUpok9Y_AAAp (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1vNMAwbpXlwvkbkOAAAr)"}
{"level":30,"time":1771966261385,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1vNMAwbpXlwvkbkOAAAr (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966261388,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966265391,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1vNMAwbpXlwvkbkOAAAr (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966265407,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 8NjuYBDgyz5k43KBAAAt)"}
{"level":30,"time":1771966265407,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.1",
      "remotePort": 54654
    }
[20:51:01 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3m"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.1"
    userAgent: "axios/1.13.5"
[20:51:01 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3m"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "511",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:01 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3m"
    res: {
      "statusCode": 200
    }
    responseTime: 4.491349995136261
```

---

### [50] [WARN] Socket /chat typing_stop @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 4020ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "typing_stop",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  true,
    "data":  null
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":30,"time":1771966265391,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1vNMAwbpXlwvkbkOAAAr (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966265407,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 8NjuYBDgyz5k43KBAAAt)"}
{"level":30,"time":1771966265407,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269411,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269421,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BKSRSqPHMChhXEUHAAAv)"}
{"level":30,"time":1771966269422,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269426,"pid":7,"hostname":"c6f6f23468a0","name":"DeliveryTracker","msg":"No tracking record found for message msg-sys-1"}
{"level":30,"time":1771966269430,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269439,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1JK-YiLj3DPoFwkQAAAx)"}
{"level":30,"time":1771966269440,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269442,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted message_read in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966269444,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269453,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BIJXRxIBrYIcoul0AAAz)"}
{"level":30,"time":1771966269454,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269463,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: zIeMhOpTnN38rVq7AAA1)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269473,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: zIeMhOpTnN38rVq7AAA1) left room: tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room"}
{"level":30,"time":1771966269475,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269483,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Tp6CvD0Jb5htPuw2AAA3)"}
[Presence] Client connected: Tp6CvD0Jb5htPuw2AAA3 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 updated presence to: online
```
caas-auth-service:
```text
[20:51:09 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-3n"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "127.0.0.1:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 44074
    }
[20:51:09 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3n"
    method: "GET"
    url: "/health"
    ip: "127.0.0.1"
[20:51:09 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3n"
    res: {
      "statusCode": 200
    }
    responseTime: 2.7623080015182495
```

---

### [51] [PASS] Socket /chat message_delivered @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 20ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "message_delivered",
    "payload":  {
                    "messageId":  "msg-sys-1",
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "ok",
                 "receipt":  {
                                 "message_id":  "msg-sys-1",
                                 "conversation_id":  "conv-system-room",
                                 "delivered_to":  "eae523a3-2723-41bf-ade3-6955772c6c97",
                                 "delivered_at":  "2026-02-24T20:51:09.426Z"
                             }
             }
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":30,"time":1771966269411,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269421,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BKSRSqPHMChhXEUHAAAv)"}
{"level":30,"time":1771966269422,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269426,"pid":7,"hostname":"c6f6f23468a0","name":"DeliveryTracker","msg":"No tracking record found for message msg-sys-1"}
{"level":30,"time":1771966269430,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269439,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1JK-YiLj3DPoFwkQAAAx)"}
{"level":30,"time":1771966269440,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269442,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted message_read in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966269444,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269453,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BIJXRxIBrYIcoul0AAAz)"}
{"level":30,"time":1771966269454,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269463,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: zIeMhOpTnN38rVq7AAA1)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269473,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: zIeMhOpTnN38rVq7AAA1) left room: tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room"}
{"level":30,"time":1771966269475,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269483,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Tp6CvD0Jb5htPuw2AAA3)"}
[Presence] Client connected: Tp6CvD0Jb5htPuw2AAA3 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 updated presence to: online
```
caas-auth-service:
```text
[20:51:09 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-3n"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "127.0.0.1:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 44074
    }
[20:51:09 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3n"
    method: "GET"
    url: "/health"
    ip: "127.0.0.1"
[20:51:09 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3n"
    res: {
      "statusCode": 200
    }
    responseTime: 2.7623080015182495
```

---

### [52] [PASS] Socket /chat message_read @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "message_read",
    "payload":  {
                    "messageId":  "msg-sys-1",
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "Not a member of this room"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":30,"time":1771966269411,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269421,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BKSRSqPHMChhXEUHAAAv)"}
{"level":30,"time":1771966269422,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269426,"pid":7,"hostname":"c6f6f23468a0","name":"DeliveryTracker","msg":"No tracking record found for message msg-sys-1"}
{"level":30,"time":1771966269430,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269439,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1JK-YiLj3DPoFwkQAAAx)"}
{"level":30,"time":1771966269440,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269442,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted message_read in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966269444,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269453,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BIJXRxIBrYIcoul0AAAz)"}
{"level":30,"time":1771966269454,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269463,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: zIeMhOpTnN38rVq7AAA1)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269473,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: zIeMhOpTnN38rVq7AAA1) left room: tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room"}
{"level":30,"time":1771966269475,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269483,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Tp6CvD0Jb5htPuw2AAA3)"}
[Presence] Client connected: Tp6CvD0Jb5htPuw2AAA3 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 updated presence to: online
```
caas-auth-service:
```text
[20:51:09 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-3n"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "127.0.0.1:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 44074
    }
[20:51:09 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3n"
    method: "GET"
    url: "/health"
    ip: "127.0.0.1"
[20:51:09 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3n"
    res: {
      "statusCode": 200
    }
    responseTime: 2.7623080015182495
```

---

### [53] [PASS] Socket /chat unread_query @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 19ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "unread_query",
    "payload":  {

                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "ok",
                 "unread":  {

                            },
                 "total":  0
             }
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":30,"time":1771966269411,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269421,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BKSRSqPHMChhXEUHAAAv)"}
{"level":30,"time":1771966269422,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269426,"pid":7,"hostname":"c6f6f23468a0","name":"DeliveryTracker","msg":"No tracking record found for message msg-sys-1"}
{"level":30,"time":1771966269430,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269439,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1JK-YiLj3DPoFwkQAAAx)"}
{"level":30,"time":1771966269440,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269442,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted message_read in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966269444,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269453,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BIJXRxIBrYIcoul0AAAz)"}
{"level":30,"time":1771966269454,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269463,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: zIeMhOpTnN38rVq7AAA1)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269473,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: zIeMhOpTnN38rVq7AAA1) left room: tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room"}
{"level":30,"time":1771966269475,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269483,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Tp6CvD0Jb5htPuw2AAA3)"}
[Presence] Client connected: Tp6CvD0Jb5htPuw2AAA3 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 updated presence to: online
```
caas-auth-service:
```text
[20:51:09 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-3n"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "127.0.0.1:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 44074
    }
[20:51:09 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3n"
    method: "GET"
    url: "/health"
    ip: "127.0.0.1"
[20:51:09 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3n"
    res: {
      "statusCode": 200
    }
    responseTime: 2.7623080015182495
```

---

### [54] [PASS] Socket /chat leaveRoom @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 13ms
- **Tags:** socket, alice, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "leaveRoom",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "ok",
                 "room":  "tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
{"level":30,"time":1771966269411,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 8NjuYBDgyz5k43KBAAAt (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269421,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BKSRSqPHMChhXEUHAAAv)"}
{"level":30,"time":1771966269422,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269426,"pid":7,"hostname":"c6f6f23468a0","name":"DeliveryTracker","msg":"No tracking record found for message msg-sys-1"}
{"level":30,"time":1771966269430,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BKSRSqPHMChhXEUHAAAv (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269439,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 1JK-YiLj3DPoFwkQAAAx)"}
{"level":30,"time":1771966269440,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966269442,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 attempted message_read in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966269444,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: 1JK-YiLj3DPoFwkQAAAx (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269453,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: BIJXRxIBrYIcoul0AAAz)"}
{"level":30,"time":1771966269454,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269463,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: BIJXRxIBrYIcoul0AAAz (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: zIeMhOpTnN38rVq7AAA1)"}
{"level":30,"time":1771966269470,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269473,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] User eae523a3-2723-41bf-ade3-6955772c6c97 (Socket: zIeMhOpTnN38rVq7AAA1) left room: tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room"}
{"level":30,"time":1771966269475,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: zIeMhOpTnN38rVq7AAA1 (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966269483,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Tp6CvD0Jb5htPuw2AAA3)"}
[Presence] Client connected: Tp6CvD0Jb5htPuw2AAA3 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 updated presence to: online
```
caas-auth-service:
```text
[20:51:09 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-3n"
    req: {
      "method": "GET",
      "url": "/health",
      "hostname": "127.0.0.1:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 44074
    }
[20:51:09 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3n"
    method: "GET"
    url: "/health"
    ip: "127.0.0.1"
[20:51:09 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3n"
    res: {
      "statusCode": 200
    }
    responseTime: 2.7623080015182495
```

---

### [55] [WARN] Socket /presence presence_update @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 4022ms
- **Tags:** socket, alice, presence

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/presence",
    "event":  "presence_update",
    "payload":  {
                    "status":  "online",
                    "custom_status":  "system testing"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  true,
    "data":  null
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [56] [WARN] Socket /presence presence_subscribe @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 16ms
- **Tags:** socket, alice, presence

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/presence",
    "event":  "presence_subscribe",
    "payload":  {
                    "user_ids":  [
                                     "alice-1771966259071",
                                     "bob-1771966259071"
                                 ]
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "success":  false,
                 "error":  "Not authenticated"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [57] [WARN] Socket /presence presence_subscriptions_query @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 13ms
- **Tags:** socket, alice, presence

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/presence",
    "event":  "presence_subscriptions_query",
    "payload":  {

                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "success":  false,
                 "error":  "Not authenticated"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [58] [WARN] Socket /presence presence_unsubscribe @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 11ms
- **Tags:** socket, alice, presence

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/presence",
    "event":  "presence_unsubscribe",
    "payload":  {
                    "user_ids":  [
                                     "alice-1771966259071"
                                 ]
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "success":  false,
                 "error":  "Not authenticated"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [59] [PASS] Socket /webrtc webrtc:get-ice-servers @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 16ms
- **Tags:** socket, alice, webrtc

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/webrtc",
    "event":  "webrtc:get-ice-servers",
    "payload":  {

                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "ok",
                 "ice_servers":  [
                                     {
                                         "urls":  [
                                                      "stun:stun.l.google.com:19302",
                                                      "stun:stun1.l.google.com:19302",
                                                      "stun:stun2.l.google.com:19302"
                                                  ]
                                     }
                                 ]
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [60] [PASS] Socket /webrtc call:initiate @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 18ms
- **Tags:** socket, alice, webrtc

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/webrtc",
    "event":  "call:initiate",
    "payload":  {
                    "targetUserId":  "bob-1771966259071",
                    "callType":  "video"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "ok",
                 "call_id":  "54e94340-1d94-4c56-8766-b8c95e712bbb",
                 "call":  {
                              "id":  "54e94340-1d94-4c56-8766-b8c95e712bbb",
                              "type":  "one_to_one",
                              "status":  "ringing",
                              "caller_id":  "eae523a3-2723-41bf-ade3-6955772c6c97",
                              "participants":  [
                                                   {
                                                       "user_id":  "eae523a3-2723-41bf-ade3-6955772c6c97",
                                                       "status":  "calling",
                                                       "joined_at":  "2026-02-24T20:51:13.566Z"
                                                   },
                                                   {
                                                       "status":  "ringing"
                                                   }
                                               ],
                              "tenant_id":  "e5633ec8-7499-45cd-9fec-cc142a7e53de",
                              "created_at":  "2026-02-24T20:51:13.566Z"
                          }
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [61] [PASS] Socket /webrtc call:hangup @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 19ms
- **Tags:** socket, alice, webrtc

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/webrtc",
    "event":  "call:hangup",
    "payload":  {
                    "callId":  "call-sys-1"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "ok"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [62] [PASS] Socket /chat moderate:mute @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 20ms
- **Tags:** socket, alice, moderation

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "moderate:mute",
    "payload":  {
                    "conversationId":  "conv-system-room",
                    "userId":  "bob-1771966259071",
                    "durationMs":  30000
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "Moderator does not have permission to mute users"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [63] [PASS] Socket /chat moderate:unmute @ socket-service-1:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 20ms
- **Tags:** socket, alice, moderation

**Request:**
```json
{
    "socketUrl":  "http://socket-service-1:3001",
    "namespace":  "/chat",
    "event":  "moderate:unmute",
    "payload":  {
                    "conversationId":  "conv-system-room",
                    "userId":  "bob-1771966259071"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "Moderator does not have permission to unmute users"
             }
}
```

**Service Logs:**
caas-socket-1:
```text
[Presence] Client connected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
[Presence] Client disconnected: vDI4IGzLXx85dnrDAAA7 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273533,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: MFIVYzDTAI6VyjgtAAA9)"}
[Presence] Client connected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 unsubscribed from [object Object]'s presence.
[Presence] Client disconnected: MFIVYzDTAI6VyjgtAAA9 for user: eae523a3-2723-41bf-ade3-6955772c6c97
User eae523a3-2723-41bf-ade3-6955772c6c97 disconnected. Reason: client namespace disconnect
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: 5W2_sbycQdNY-a7_AAA_)"}
{"level":30,"time":1771966273547,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273553,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: 5W2_sbycQdNY-a7_AAA_ (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: qIqtj2i8e_0AEctYAABB)"}
{"level":30,"time":1771966273561,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273565,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 initiating undefined call to undefined"}
{"level":30,"time":1771966273567,"pid":7,"hostname":"c6f6f23468a0","name":"CallManager","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb created"}
{"level":40,"time":1771966273569,"pid":7,"hostname":"c6f6f23468a0","name":"SignalingRelay","msg":"Cannot relay call:incoming to offline user undefined"}
{"level":30,"time":1771966273571,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: qIqtj2i8e_0AEctYAABB (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273574,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Ending call 54e94340-1d94-4c56-8766-b8c95e712bbb due to user eae523a3-2723-41bf-ade3-6955772c6c97 disconnect"}
{"level":30,"time":1771966273580,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Call 54e94340-1d94-4c56-8766-b8c95e712bbb ended by eae523a3-2723-41bf-ade3-6955772c6c97 (reason: user_hangup)"}
{"level":40,"time":1771966273582,"pid":7,"hostname":"c6f6f23468a0","name":"CallHistorySaver","msg":"No MongoDB collection available for call history"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uNINIbpM3joQ0R0JAABD)"}
{"level":30,"time":1771966273585,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client connected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":40,"time":1771966273588,"pid":7,"hostname":"c6f6f23468a0","name":"CallTerminator","msg":"Cannot end call: Call undefined not found"}
{"level":30,"time":1771966273590,"pid":7,"hostname":"c6f6f23468a0","name":"WebRTCNamespace","msg":"[WebRTC] Client disconnected: uNINIbpM3joQ0R0JAABD (User: eae523a3-2723-41bf-ade3-6955772c6c97)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: uSw_0CFTRKSHG_8hAABF)"}
{"level":30,"time":1771966273601,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273610,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: uSw_0CFTRKSHG_8hAABF (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273620,"pid":7,"hostname":"c6f6f23468a0","name":"SocketAuthMiddleware","msg":"User eae523a3-2723-41bf-ade3-6955772c6c97 authenticated via auth service (socket: Size9FTL_GvSdAZ3AABH)"}
{"level":30,"time":1771966273621,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client connected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273630,"pid":7,"hostname":"c6f6f23468a0","name":"ChatNamespace","msg":"[Chat] Client disconnected: Size9FTL_GvSdAZ3AABH (User: eae523a3-2723-41bf-ade3-6955772c6c97, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [64] [PASS] Socket /chat joinRoom @ socket-service-2:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 68ms
- **Tags:** socket, bob, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-2:3001",
    "namespace":  "/chat",
    "event":  "joinRoom",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "User is not a member of this conversation"
             }
}
```

**Service Logs:**
caas-socket-2:
```text
{"level":30,"time":1771966273675,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: PHjGh-9xd0LGa8nUAAAP)"}
{"level":30,"time":1771966273676,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: PHjGh-9xd0LGa8nUAAAP (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273696,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966273698,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: PHjGh-9xd0LGa8nUAAAP (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273708,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: nPgfCqd4q9RoBTa-AAAR)"}
{"level":30,"time":1771966273709,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: nPgfCqd4q9RoBTa-AAAR (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273712,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd (Socket: nPgfCqd4q9RoBTa-AAAR) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966273714,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: nPgfCqd4q9RoBTa-AAAR (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273725,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: 6BbqiaXegJw5cNHuAAAT)"}
{"level":30,"time":1771966273725,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: 6BbqiaXegJw5cNHuAAAT (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273727,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [65] [PASS] Socket /chat sendMessage @ socket-service-2:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** passed
- **Duration:** 16ms
- **Tags:** socket, bob, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-2:3001",
    "namespace":  "/chat",
    "event":  "sendMessage",
    "payload":  {
                    "conversationId":  "conv-system-room",
                    "messageContent":  "Bob replying on socket-2"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  false,
    "data":  {
                 "status":  "error",
                 "message":  "Not a member of this room"
             }
}
```

**Service Logs:**
caas-socket-2:
```text
{"level":30,"time":1771966273675,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: PHjGh-9xd0LGa8nUAAAP)"}
{"level":30,"time":1771966273676,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: PHjGh-9xd0LGa8nUAAAP (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273696,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966273698,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: PHjGh-9xd0LGa8nUAAAP (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273708,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: nPgfCqd4q9RoBTa-AAAR)"}
{"level":30,"time":1771966273709,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: nPgfCqd4q9RoBTa-AAAR (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273712,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd (Socket: nPgfCqd4q9RoBTa-AAAR) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966273714,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: nPgfCqd4q9RoBTa-AAAR (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273725,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: 6BbqiaXegJw5cNHuAAAT)"}
{"level":30,"time":1771966273725,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: 6BbqiaXegJw5cNHuAAAT (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273727,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [66] [WARN] Socket /chat typing_start @ socket-service-2:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 4013ms
- **Tags:** socket, bob, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-2:3001",
    "namespace":  "/chat",
    "event":  "typing_start",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  true,
    "data":  null
}
```

**Service Logs:**
caas-socket-2:
```text
{"level":30,"time":1771966273675,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: PHjGh-9xd0LGa8nUAAAP)"}
{"level":30,"time":1771966273676,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: PHjGh-9xd0LGa8nUAAAP (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273696,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd denied joining conversation conv-system-room: User is not a member of this conversation"}
{"level":30,"time":1771966273698,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: PHjGh-9xd0LGa8nUAAAP (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273708,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: nPgfCqd4q9RoBTa-AAAR)"}
{"level":30,"time":1771966273709,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: nPgfCqd4q9RoBTa-AAAR (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273712,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd (Socket: nPgfCqd4q9RoBTa-AAAR) attempted to send message to room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member."}
{"level":30,"time":1771966273714,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: nPgfCqd4q9RoBTa-AAAR (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966273725,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: 6BbqiaXegJw5cNHuAAAT)"}
{"level":30,"time":1771966273725,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: 6BbqiaXegJw5cNHuAAAT (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":40,"time":1771966273727,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] User a1f229a7-ecf1-4772-be73-51868d143afd attempted typing_start in room tenant:e5633ec8-7499-45cd-9fec-cc142a7e53de:conversation:conv-system-room without being a member"}
{"level":30,"time":1771966277728,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: 6BbqiaXegJw5cNHuAAAT (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966277738,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: NMesxbatblBacynqAAAV)"}
{"level":30,"time":1771966277738,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: NMesxbatblBacynqAAAV (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
```
caas-auth-service:
```text
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.7.2",
      "remotePort": 45558
    }
[20:51:13 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-3o"
    method: "POST"
    url: "/api/v1/auth/internal/validate"
    ip: "172.28.7.2"
    userAgent: "axios/1.13.5"
[20:51:13 UTC] [32mINFO[39m: [36mService Auth Check[39m
    reqId: "req-3o"
    headers: {
      "accept": "application/json, text/plain, */*",
      "content-type": "application/json",
      "x-service-secret": "dev-service-secret-change-in-production",
      "user-agent": "axios/1.13.5",
      "content-length": "553",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "auth-service:3001",
      "connection": "keep-alive"
    }
    received: "dev..."
    expected: "dev..."
[20:51:13 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-3o"
    res: {
      "statusCode": 200
    }
    responseTime: 3.761209011077881
```

---

### [67] [WARN] Socket /chat typing_stop @ socket-service-2:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 4013ms
- **Tags:** socket, bob, chat

**Request:**
```json
{
    "socketUrl":  "http://socket-service-2:3001",
    "namespace":  "/chat",
    "event":  "typing_stop",
    "payload":  {
                    "conversationId":  "conv-system-room"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  true,
    "data":  null
}
```

**Service Logs:**
caas-socket-2:
```text
{"level":30,"time":1771966277728,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: 6BbqiaXegJw5cNHuAAAT (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966277738,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: NMesxbatblBacynqAAAV)"}
{"level":30,"time":1771966277738,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client connected: NMesxbatblBacynqAAAV (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966281741,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: NMesxbatblBacynqAAAV (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966281754,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: _M-KCiK2hj2aGBjKAAAX)"}
[Presence] Client connected: _M-KCiK2hj2aGBjKAAAX for user: a1f229a7-ecf1-4772-be73-51868d143afd
User a1f229a7-ecf1-4772-be73-51868d143afd updated presence to: online
```

---

### [68] [WARN] Socket /presence presence_update @ socket-service-2:3001
- **Type:** socket
- **Phase:** 8
- **Outcome:** warning
- **Duration:** 4017ms
- **Tags:** socket, bob, presence

**Request:**
```json
{
    "socketUrl":  "http://socket-service-2:3001",
    "namespace":  "/presence",
    "event":  "presence_update",
    "payload":  {
                    "status":  "online",
                    "custom_status":  "Bob online"
                },
    "withToken":  true,
    "expectConnect":  true
}
```

**Response:**
```json
{
    "timeout":  true,
    "data":  null
}
```

**Service Logs:**
caas-socket-2:
```text
{"level":30,"time":1771966281741,"pid":7,"hostname":"3d61d567f427","name":"ChatNamespace","msg":"[Chat] Client disconnected: NMesxbatblBacynqAAAV (User: a1f229a7-ecf1-4772-be73-51868d143afd, Tenant: e5633ec8-7499-45cd-9fec-cc142a7e53de)"}
{"level":30,"time":1771966281754,"pid":7,"hostname":"3d61d567f427","name":"SocketAuthMiddleware","msg":"User a1f229a7-ecf1-4772-be73-51868d143afd authenticated via auth service (socket: _M-KCiK2hj2aGBjKAAAX)"}
[Presence] Client connected: _M-KCiK2hj2aGBjKAAAX for user: a1f229a7-ecf1-4772-be73-51868d143afd
User a1f229a7-ecf1-4772-be73-51868d143afd updated presence to: online
[Presence] Client disconnected: _M-KCiK2hj2aGBjKAAAX for user: a1f229a7-ecf1-4772-be73-51868d143afd
User a1f229a7-ecf1-4772-be73-51868d143afd disconnected. Reason: client namespace disconnect
```
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [69] [PASS] Cross-Tenant Access (Tenant B on A routes)
- **Type:** http
- **Phase:** 9
- **Outcome:** passed
- **Duration:** 15ms
- **Tags:** security, isolation

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/tenant",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOTA2MTg5Zi0zNzE1LTQwYzItOWNhNi01OGNjOTdiNjJkZGMiLCJ1c2VyX2lkIjoiYzAyM2NjYTEtOTE3MS00NWU5LTg1MTgtZDE0YzMyZTA3Yjk5IiwidGVuYW50X2lkIjoiODI5ZmNhNmMtNjk3NS00NWQ4LTgyYzAtZDYyMzE3YTIwMDNhIiwiZW1haWwiOiJjaGFybGllLTE3NzE5NjYyNTkwNzFAc2RrLjgyOWZjYTZjLTY5NzUtNDVkOC04MmMwLWQ2MjMxN2EyMDAzYS5jYWFzLmlvIiwiZXh0ZXJuYWxfaWQiOiJjaGFybGllLTE3NzE5NjYyNTkwNzEiLCJzZXNzaW9uX2lkIjoiNmY5YzQ4YWUtZDY4ZC00M2M2LWIwY2ItYmFmZTBlNmVhZGVjIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MTk2NjI2MCwiZXhwIjoxNzcxOTY3MTYwLCJpc3MiOiJjYWFzLWF1dGgtc2VydmljZSJ9.0ulJXhWmU_PIFDGk1cUslxPp0sTMamIxsUNpgNSp4eU"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "f4926268-6315-4c11-af81-6d773c4235de",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "86",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant 829fca6c-6975-45d8-82c0-d62317a2003a not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [70] [PASS] Sessions without Auth
- **Type:** http
- **Phase:** 9
- **Outcome:** passed
- **Duration:** 9ms
- **Tags:** security, negative

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/sessions",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             401,
                             403
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "24",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "b2ad814b-40b3-480f-852b-7675bf178666",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "92",
                    "x-ratelimit-reset":  "1771966318",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Unauthorized\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [71] [PASS] Get IP Whitelist
- **Type:** http
- **Phase:** 9
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** auth, whitelist

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://auth-service:3001/api/v1/auth/client/ip-whitelist?client_id=8471a2bf-4081-4802-bfed-8225297015fe",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "68",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "67fa6d12-5930-46cf-862b-f1f2b5ecd16d",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9982",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Authentication failed: Invalid or missing service secret\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [72] [PASS] Add IP to Whitelist
- **Type:** http
- **Phase:** 9
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** auth, whitelist

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/ip-whitelist",
    "headers":  {

                },
    "body":  "{\"client_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\",\"ip\":\"192.168.1.1\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "68",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "6de4cbf6-cad9-4254-b440-1faef71e741c",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9981",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Authentication failed: Invalid or missing service secret\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [73] [PASS] Get Origin Whitelist
- **Type:** http
- **Phase:** 9
- **Outcome:** passed
- **Duration:** 3ms
- **Tags:** auth, whitelist

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://auth-service:3001/api/v1/auth/client/origin-whitelist?client_id=8471a2bf-4081-4802-bfed-8225297015fe",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "68",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "41461704-49c6-47ad-bfca-189ad64780aa",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9980",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Authentication failed: Invalid or missing service secret\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [74] [PASS] Add Origin to Whitelist
- **Type:** http
- **Phase:** 9
- **Outcome:** passed
- **Duration:** 3ms
- **Tags:** auth, whitelist

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/client/origin-whitelist",
    "headers":  {

                },
    "body":  "{\"client_id\":\"8471a2bf-4081-4802-bfed-8225297015fe\",\"origin\":\"https://systemtest.com\"}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "68",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "8581cbb4-7a32-43f2-a1fc-c7e44d5691cd",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9979",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Authentication failed: Invalid or missing service secret\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [75] [PASS] Gateway OpenAPI Spec
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** discovery

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/documentation/json",
    "headers":  {

                },
    "body":  null,
    "acceptableStatus":  [
                             200
                         ]
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "24081",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "c5d6768f-e21f-4459-8702-97ad96b8ef91",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "91",
                    "x-ratelimit-reset":  "1771966318",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"openapi\":\"3.0.3\",\"info\":{\"title\":\"CAAS API Gateway\",\"description\":\"API Gateway for CAAS Platform\",\"version\":\"1.0.0\"},\"components\":{\"securitySchemes\":{\"bearerAuth\":{\"type\":\"http\",\"scheme\":\"bearer\",\"bearerFormat\":\"JWT\"}},\"schemas\":{}},\"paths\":{\"/internal/health\":{\"get\":{\"responses\":{\"200\":{\"description\":\"Default Response\"}}}},\"/internal/ready\":{\"get\":{\"responses\":{\"200\":{\"description\":\"Default Response\"}}}},\"/internal/health/detailed\":{\"get\":{\"responses\":{\"200\":{\"description\":\"Default Response\"}}}},\"/internal/metrics\":{\"get\":{\"responses\":{\"200\":{\"description\":\"Default Response\"}}}},\"/health\":{\"get\":{\"responses\":{\"200\":{\"description\":\"Default Response\"}}}},\"/v1/auth/sdk/token\":{\"post\":{\"tags\":[\"Auth\"],\"description\":\"Authenticate SDK and get tokens\",\"requestBody\":{\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"},\"_cached\":{\"shape\":{\"app_id\":{\"_def\":{\"checks\":[],\"typeName\":\"ZodString\",\"coerce\":false},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"app_secret\":{\"_def\":{\"checks\":[],\"typeName\":\"ZodString\",\"coerce\":false},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"user_external_id\":{\"_def\":{\"innerType\":{\"_def\":{\"checks\":[],\"typeName\":\"ZodString\",\"coerce\":false},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodOptional\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"metadata\":{\"_def\":{\"innerType\":{\"_def\":{\"keyType\":{\"_def\":{\"checks\":[],\"typeName\":\"ZodString\",\"coerce\":false},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"valueType\":{\"_def\":{\"typeName\":\"ZodAny\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"},\"_any\":true},\"typeName\":\"ZodRecord\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodOptional\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}},\"keys\":[\"app_id\",\"app_secret\",\"user_external_id\",\"metadata\"]}}}}},\"responses\":{\"200\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}}},\"/v1/auth/logout\":{\"post\":{\"tags\":[\"Auth\"],\"description\":\"Logout and invalidate tokens\",\"requestBody\":{\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}},\"responses\":{\"204\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"typeName\":\"ZodNull\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}}},\"/v1/auth/api-keys\":{\"post\":{\"tags\":[\"Auth\"],\"description\":\"Create a new API Key\",\"requestBody\":{\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"},\"_cached\":{\"shape\":{\"name\":{\"_def\":{\"checks\":[{\"kind\":\"min\",\"value\":1}],\"typeName\":\"ZodString\",\"coerce\":false},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"scopes\":{\"_def\":{\"innerType\":{\"_def\":{\"type\":{\"_def\":{\"checks\":[],\"typeName\":\"ZodString\",\"coerce\":false},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodArray\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodDefault\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}},\"keys\":[\"name\",\"scopes\"]}}}}},\"responses\":{\"201\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}},\"get\":{\"tags\":[\"Auth\"],\"description\":\"List API Keys\",\"responses\":{\"200\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"type\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodArray\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}}},\"/v1/auth/api-keys/{id}\":{\"delete\":{\"tags\":[\"Auth\"],\"parameters\":[{\"schema\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"in\":\"path\",\"name\":\"_def\",\"required\":true},{\"schema\":{\"version\":1,\"vendor\":\"zod\"},\"in\":\"path\",\"name\":\"~standard\",\"required\":true}],\"responses\":{\"200\":{\"description\":\"Default Response\"}}}},\"/v1/sessions\":{\"get\":{\"tags\":[\"sessions\"],\"description\":\"List current user sessions\",\"responses\":{\"200\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}}},\"/v1/sessions/{id}\":{\"delete\":{\"tags\":[\"sessions\"],\"description\":\"Revoke specific session\",\"parameters\":[{\"schema\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"in\":\"path\",\"name\":\"_def\",\"required\":true},{\"schema\":{\"version\":1,\"vendor\":\"zod\"},\"in\":\"path\",\"name\":\"~standard\",\"required\":true}],\"responses\":{\"200\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}}},\"/v1/sessions/others\":{\"delete\":{\"tags\":[\"sessions\"],\"description\":\"Logout all other devices\",\"responses\":{\"200\":{\"description\":\"Default Response\",\"content\":{\"application/json\":{\"schema\":{\"_def\":{\"unknownKeys\":\"strip\",\"catchall\":{\"_def\":{\"typeName\":\"ZodNever\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}},\"typeName\":\"ZodObject\"},\"~standard\":{\"version\":1,\"vendor\":\"zod\"}}}}}}}},\"/v1/sessions/all\":{\"delete\":{\"tags\":[\"sessio… [truncated 18081 chars]",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [76] [PASS] Discover GET /health
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/health",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "afaed81b-dd0f-4be9-a80a-5fa675aec240",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "83",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [77] [PASS] Discover POST /v1/auth/sdk/token
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/auth/sdk/token",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "815a4323-cb1f-4341-9f51-0a6ea7d4997f",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "82",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [78] [PASS] Discover POST /v1/auth/logout
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/auth/logout",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "4106e1d2-b61a-4e71-9b26-b2d868c5f7d3",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "81",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [79] [PASS] Discover POST /v1/auth/api-keys
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/auth/api-keys",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "04a908cf-76d7-4baf-8fbf-eba5f76971c7",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "80",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [80] [PASS] Discover GET /v1/auth/api-keys
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/auth/api-keys",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "cadf20e3-73f1-4ddc-914c-1a3d8e1b4ab6",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "79",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [81] [PASS] Discover DELETE /v1/auth/api-keys/sample-id
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/auth/api-keys/sample-id",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "21918b60-eff8-4ccd-8bf5-a13933845fa9",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "78",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [82] [PASS] Discover GET /v1/sessions
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 13ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/sessions",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "4d30ce04-33a5-43e2-9fdc-e68e9275c937",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "77",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [83] [PASS] Discover DELETE /v1/sessions/sample-id
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 13ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/sessions/sample-id",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "de7da354-8815-49ed-ac50-96277a42d365",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "76",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [84] [PASS] Discover DELETE /v1/sessions/others
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/sessions/others",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "bf4b6933-3ca7-4c15-b6b4-183799241f14",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "75",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [85] [PASS] Discover DELETE /v1/sessions/all
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/sessions/all",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "8a31eaa6-6696-4554-abad-b6bf5a3ef95c",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "74",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [86] [PASS] Discover POST /v1/mfa/mfa/challenge
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/mfa/mfa/challenge",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "57ff4f1a-f904-47e8-aa61-470092c29703",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "73",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [87] [PASS] Discover POST /v1/mfa/mfa/verify
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/mfa/mfa/verify",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "765864b9-7f36-4dfa-a1d0-6940c79f3047",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "72",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [88] [PASS] Discover POST /v1/mfa/mfa/backup
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/mfa/mfa/backup",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "eda3a01e-8cf1-4032-a337-bd7bed9b311d",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "71",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [89] [PASS] Discover GET /v1/mfa/mfa/status
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/mfa/mfa/status",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "265b1719-02a9-4ade-ae0f-a7b9011a9df4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "70",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [90] [PASS] Discover GET /v1/admin/dlq
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 17ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/dlq",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "7a0b923d-c2e0-4002-a38e-11c869a0b6ad",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "69",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [91] [PASS] Discover GET /v1/admin/dlq/sample-id
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/dlq/sample-id",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "83",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "a593b5ef-ea37-4e6c-a9ef-c44edb026889",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "68",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [92] [PASS] Discover DELETE /v1/admin/dlq/sample-id
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/admin/dlq/sample-id",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "13bf145c-f372-4f14-8689-1c1825db4c3e",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "67",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [93] [PASS] Discover POST /v1/admin/dlq/sample-id/reprocess
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/admin/dlq/sample-id/reprocess",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "83",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:25 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "263b5374-e933-4210-820d-ddb405c5a101",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "66",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [94] [PASS] Discover POST /v1/admin/dlq/bulk/reprocess
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/admin/dlq/bulk/reprocess",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "158fc6cb-c46e-4e60-ae8d-66c1a3284393",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "65",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [95] [PASS] Discover POST /v1/admin/dlq/bulk/delete
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/admin/dlq/bulk/delete",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "37776053-0905-4e19-8658-9e7816bbd49e",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "64",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [96] [PASS] Discover GET /v1/admin/dlq/stats
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/dlq/stats",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "8f37fda2-4b3b-4904-8a66-bc5ff78f6bae",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "63",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [97] [PASS] Discover GET /v1/admin/dlq/stats/errors
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 17ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/dlq/stats/errors",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "1f76a4e6-6e14-4d0a-bfc4-0310cd6e5ca5",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "62",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [98] [PASS] Discover GET /v1/admin/dlq/stats/topics
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 10ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/dlq/stats/topics",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "3be5a07e-9678-4ba2-920c-71da901969e9",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "61",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [99] [PASS] Discover GET /v1/admin/users/sample-user/sessions
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 18ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/users/sample-user/sessions",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "7571c9f5-ab23-4833-828c-cf2c4bfe990b",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "60",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [100] [PASS] Discover DELETE /v1/admin/users/sample-user/sessions
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 8ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/admin/users/sample-user/sessions",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "3caae8d1-6cec-4858-a35a-c0044f5d4a8b",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "59",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [101] [PASS] Discover DELETE /v1/admin/sessions/sample-id
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 8ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/admin/sessions/sample-id",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "c96ea29d-721e-4ef3-b7c6-0597de781071",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "58",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [102] [PASS] Discover GET /v1/admin/sessions/active
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 21ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/sessions/active",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "39b45387-2ef8-49ec-9e4b-f9fdab4e6b0b",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "57",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [103] [PASS] Discover GET /v1/admin/tenant/mfa
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 13ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/tenant/mfa",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "24eb0a29-6c4f-4a36-b373-5f05c55471c0",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "56",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [104] [PASS] Discover PUT /v1/admin/tenant/mfa
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 7ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "PUT",
    "url":  "http://gateway:3000/v1/admin/tenant/mfa",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "83eb402d-04ab-452e-832d-946ef1adf176",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "55",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [105] [PASS] Discover GET /v1/admin/users/mfa-status
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 14ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/admin/users/mfa-status",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "aede3b4f-626c-47da-bd77-aa61534d5be8",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "54",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [106] [PASS] Discover POST /v1/admin/users/sample-user/mfa/enforce
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 4ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/admin/users/sample-user/mfa/enforce",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "e3e61b3b-0001-4090-8abd-bc200bc21193",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "53",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [107] [PASS] Discover POST /v1/admin/mfa/enforce-all
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 6ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/admin/mfa/enforce-all",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "b3dc45a9-4d22-4d31-b578-943ccce2bb2e",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "52",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [108] [PASS] Discover POST /v1/webhooks/
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/webhooks/",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "81fd37cf-14bd-4193-a535-bad44b9716a1",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "51",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [109] [PASS] Discover GET /v1/webhooks/
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/webhooks/",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "f858361b-d28d-4900-9bde-36acebc20d86",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "50",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [110] [PASS] Discover DELETE /v1/webhooks/sample-id
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 9ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "DELETE",
    "url":  "http://gateway:3000/v1/webhooks/sample-id",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "7c2ac65e-6c29-462d-a4d0-1592d4d264f7",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "49",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [111] [PASS] Discover GET /v1/webhooks/sample-id/logs
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 8ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/webhooks/sample-id/logs",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "0b3b1411-bb58-4727-900c-fbf98082f611",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "48",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [112] [PASS] Discover GET /v1/tenant/
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/tenant/",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "9421497b-ec17-4815-91e9-7115630001f0",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "47",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [113] [PASS] Discover PUT /v1/tenant/settings
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 4ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "PUT",
    "url":  "http://gateway:3000/v1/tenant/settings",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "sample",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  400,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "113",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "599643f2-6182-443f-9ea0-4cc6a6e962cd",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "46",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":400,\"error\":\"Internal Server Error\",\"message\":\"Unexpected token \u0027s\u0027, \\\"sample\\\" is not valid JSON\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [114] [PASS] Discover GET /v1/tenant/usage
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/tenant/usage",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "b15b7045-69d8-4080-8a55-ffeb95cc44a4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "45",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [115] [PASS] Discover GET /v1/usage/usage/export
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 12ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/usage/usage/export",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "d162b0b6-9733-47d9-b335-f9850ac0ded2",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "44",
                    "x-ratelimit-reset":  "34",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [116] [PASS] Discover POST /v1/sdk/session
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 13ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/sdk/session",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "d7784dcb-692f-4184-9512-e6a2524bd1f6",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "43",
                    "x-ratelimit-reset":  "33",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [117] [PASS] Discover POST /v1/sdk/refresh
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/sdk/refresh",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "6926f90b-b6f0-4a35-aac6-9484bcb1b240",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "42",
                    "x-ratelimit-reset":  "33",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [118] [PASS] Discover POST /v1/sdk/logout
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/sdk/logout",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "30fa412e-beb4-43bc-9793-843434a4f09b",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "41",
                    "x-ratelimit-reset":  "33",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [119] [PASS] Discover POST /v1/client/register
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 9ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://gateway:3000/v1/client/register",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "049cfbbd-0965-4542-abf5-45aa83522f96",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "40",
                    "x-ratelimit-reset":  "33",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [120] [PASS] Discover GET /v1/ping
- **Type:** http
- **Phase:** 10
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** discovery, gateway

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://gateway:3000/v1/ping",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  404,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "access-control-allow-origin":  "*",
                    "connection":  "keep-alive",
                    "content-length":  "100",
                    "content-security-policy":  "default-src \u0027self\u0027;base-uri \u0027self\u0027;font-src \u0027self\u0027 https: data:;form-action \u0027self\u0027;frame-ancestors \u0027self\u0027;img-src \u0027self\u0027 data:;object-src \u0027none\u0027;script-src \u0027self\u0027;script-src-attr \u0027none\u0027;style-src \u0027self\u0027 https: \u0027unsafe-inline\u0027;upgrade-insecure-requests",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "04b544b8-5cd4-4738-9108-44017dc936db",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "100",
                    "x-ratelimit-remaining":  "39",
                    "x-ratelimit-reset":  "33",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"statusCode\":404,\"error\":\"Error\",\"message\":\"Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found\"}",
    "error":  null
}
```

**Service Logs:**
caas-gateway:
```text
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    user_id: "eae523a3-2723-41bf-ade3-6955772c6c97"
    tenant_id: "e5633ec8-7499-45cd-9fec-cc142a7e53de"
[20:51:26.278] [31mERROR[39m (1): [36mTenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "04b544b8-5cd4-4738-9108-44017dc936db"
    err: {
      "type": "NotFoundError",
      "message": "Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found",
      "stack":
          Error: Tenant e5633ec8-7499-45cd-9fec-cc142a7e53de not found
              at Object.resolveTenant (/services/gateway/dist/src/middleware/tenant/tenant-resolver.js:40:15)
              at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      "statusCode": 404,
      "code": "NOT_FOUND",
      "isOperational": true
    }
[20:51:26.279] [32mINFO[39m (1): [36mRequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    correlationId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    statusCode: 404
    responseTime: 8.051914006471634
    userId: "eae523a3-2723-41bf-ade3-6955772c6c97"
[20:51:26.279] [32mINFO[39m (1): [36mrequest completed[39m
    requestId: "ebd8eb44-fbd6-450d-8e0a-ee4912e445bf"
    res: {
      "statusCode": 404
    }
    responseTime: 8.051914006471634
```

---

### [121] [PASS] Get User Profile — Alice
- **Type:** http
- **Phase:** 11
- **Outcome:** passed
- **Duration:** 5ms
- **Tags:** auth, user

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://auth-service:3001/api/v1/users/profile",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "317",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "8685684d-8a13-4e4a-aabc-e4938212dee5",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9978",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"email\":\"alice-1771966259071@test.com\",\"username\":\"Alice Tester\",\"mfa_enabled\":false,\"status\":\"active\",\"created_at\":\"2026-02-24T20:51:00.376Z\",\"updated_at\":\"2026-02-24T20:51:00.376Z\",\"_id\":\"699e0f349f7a18130ba0c6d5\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [122] [PASS] Update User Profile — Alice
- **Type:** http
- **Phase:** 11
- **Outcome:** passed
- **Duration:** 21ms
- **Tags:** auth, user

**Request:**
```json
{
    "method":  "PUT",
    "url":  "http://auth-service:3001/api/v1/users/profile",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  "{\"name\":\"Alice SystemTest Updated\",\"preferences\":{\"theme\":\"dark\"}}",
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "382",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "7f3bdbf0-bbc7-4fa6-94a7-5c1c09e413ee",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9977",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"_id\":\"699e0f349f7a18130ba0c6d5\",\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"email\":\"alice-1771966259071@test.com\",\"username\":\"Alice Tester\",\"mfa_enabled\":false,\"status\":\"active\",\"created_at\":\"2026-02-24T20:51:00.376Z\",\"updated_at\":\"2026-02-24T20:51:26.293Z\",\"name\":\"Alice SystemTest Updated\",\"preferences\":{\"theme\":\"dark\"}}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [123] [PASS] List Sessions — Alice
- **Type:** http
- **Phase:** 11
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** auth, sessions

**Request:**
```json
{
    "method":  "GET",
    "url":  "http://auth-service:3001/api/v1/sessions",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMzk1YzI2NS03MTNkLTRmNGMtOTA0Ni1mMDViMDM0OWViNmEiLCJ1c2VyX2lkIjoiZWFlNTIzYTMtMjcyMy00MWJmLWFkZTMtNjk1NTc3MmM2Yzk3IiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJhbGljZS0xNzcxOTY2MjU5MDcxQHRlc3QuY29tIiwic2Vzc2lvbl9pZCI6IjJiYjFlYjVjLTg2NmQtNDFhMy1iZjdiLWUwYTU0NjU4MjE1MiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzE5NjYyNjAsImV4cCI6MTc3MTk2NzE2MCwiaXNzIjoiY2Fhcy1hdXRoLXNlcnZpY2UifQ.er8xuUMofUnMIfGRhtUbPSFujyV0zKwEXaKsUnv9S7A"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "432",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "1ee60d22-804a-48c5-bddc-cc3d5c8b38e2",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9976",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"sessions\":[{\"_id\":\"699e0f349f7a18130ba0c6d6\",\"session_id\":\"2bb1eb5c-866d-41a3-bf7b-e0a546582152\",\"user_id\":\"eae523a3-2723-41bf-ade3-6955772c6c97\",\"tenant_id\":\"e5633ec8-7499-45cd-9fec-cc142a7e53de\",\"device_fingerprint\":null,\"ip_address\":\"172.28.0.5\",\"user_agent\":\"node\",\"location\":null,\"is_active\":true,\"expires_at\":\"2026-02-25T20:51:00.387Z\",\"created_at\":\"2026-02-24T20:51:00.388Z\",\"last_activity_at\":\"2026-02-24T20:51:00.388Z\"}]}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [124] [PASS] Logout — Bob
- **Type:** http
- **Phase:** 11
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** auth, sdk, logout

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/sdk/logout",
    "headers":  {
                    "authorization":  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjNmE4NzgwNC1hOTgzLTQ2YjItOWY4Mi1kNjE2OWZkNmQxMTQiLCJ1c2VyX2lkIjoiYTFmMjI5YTctZWNmMS00NzcyLWJlNzMtNTE4NjhkMTQzYWZkIiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJib2ItMTc3MTk2NjI1OTA3MUB0ZXN0LmNvbSIsImV4dGVybmFsX2lkIjoiYm9iLTE3NzE5NjYyNTkwNzEiLCJzZXNzaW9uX2lkIjoiYTdmYTE4NzYtNWVhMC00NDAzLTlhMmUtNDZlYWY3YjcwMGI2IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MTk2NjI2MCwiZXhwIjoxNzcxOTY3MTYwLCJpc3MiOiJjYWFzLWF1dGgtc2VydmljZSJ9.CKrUUxZk_2G7d4MNkqALrjGWJ54l5Sb_feQgX2F22Xk"
                },
    "body":  null,
    "acceptableStatus":  "any"
}
```

**Response:**
```json
{
    "status":  200,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "37",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "92448e0e-f6ad-40fd-a1da-63a35d1ffeb7",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9975",
                    "x-ratelimit-reset":  "874",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"message\":\"Logged out successfully\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

### [125] [PASS] Validate Revoked Token — Bob (should fail)
- **Type:** http
- **Phase:** 11
- **Outcome:** passed
- **Duration:** 11ms
- **Tags:** auth, negative, logout

**Request:**
```json
{
    "method":  "POST",
    "url":  "http://auth-service:3001/api/v1/auth/validate",
    "headers":  {

                },
    "body":  "{\"token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjNmE4NzgwNC1hOTgzLTQ2YjItOWY4Mi1kNjE2OWZkNmQxMTQiLCJ1c2VyX2lkIjoiYTFmMjI5YTctZWNmMS00NzcyLWJlNzMtNTE4NjhkMTQzYWZkIiwidGVuYW50X2lkIjoiZTU2MzNlYzgtNzQ5OS00NWNkLTlmZWMtY2MxNDJhN2U1M2RlIiwiZW1haWwiOiJib2ItMTc3MTk2NjI1OTA3MUB0ZXN0LmNvbSIsImV4dGVybmFsX2lkIjoiYm9iLTE3NzE5NjYyNTkwNzEiLCJzZXNzaW9uX2lkIjoiYTdmYTE4NzYtNWVhMC00NDAzLTlhMmUtNDZlYWY3YjcwMGI2IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MTk2NjI2MCwiZXhwIjoxNzcxOTY3MTYwLCJpc3MiOiJjYWFzLWF1dGgtc2VydmljZSJ9.CKrUUxZk_2G7d4MNkqALrjGWJ54l5Sb_feQgX2F22Xk\"}",
    "acceptableStatus":  [
                             401,
                             403
                         ]
}
```

**Response:**
```json
{
    "status":  401,
    "headers":  {
                    "access-control-allow-credentials":  "true",
                    "connection":  "keep-alive",
                    "content-length":  "41",
                    "content-type":  "application/json; charset=utf-8",
                    "cross-origin-opener-policy":  "same-origin",
                    "cross-origin-resource-policy":  "same-origin",
                    "date":  "Tue, 24 Feb 2026 20:51:26 GMT",
                    "keep-alive":  "timeout=72",
                    "origin-agent-cluster":  "?1",
                    "referrer-policy":  "no-referrer",
                    "strict-transport-security":  "max-age=15552000; includeSubDomains",
                    "vary":  "Origin",
                    "x-content-type-options":  "nosniff",
                    "x-correlation-id":  "1750e50f-484f-4a48-9ba6-f5038ce937a4",
                    "x-dns-prefetch-control":  "off",
                    "x-download-options":  "noopen",
                    "x-frame-options":  "SAMEORIGIN",
                    "x-permitted-cross-domain-policies":  "none",
                    "x-ratelimit-limit":  "10000",
                    "x-ratelimit-remaining":  "9974",
                    "x-ratelimit-reset":  "873",
                    "x-xss-protection":  "0"
                },
    "body":  "{\"valid\":false,\"error\":\"Session invalid\"}",
    "error":  null
}
```

**Service Logs:**
caas-auth-service:
```text
    url: "/api/v1/auth/sdk/logout"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4r"
    res: {
      "statusCode": 200
    }
    responseTime: 9.538853019475937
[20:51:26 UTC] [32mINFO[39m: [36mincoming request[39m
    reqId: "req-4s"
    req: {
      "method": "POST",
      "url": "/api/v1/auth/validate",
      "hostname": "auth-service:3001",
      "remoteAddress": "172.28.0.5",
      "remotePort": 52534
    }
[20:51:26 UTC] [32mINFO[39m: [36mIncoming request[39m
    reqId: "req-4s"
    method: "POST"
    url: "/api/v1/auth/validate"
    ip: "172.28.0.5"
    userAgent: "node"
[20:51:26 UTC] [32mINFO[39m: [36mrequest completed[39m
    reqId: "req-4s"
    res: {
      "statusCode": 401
    }
    responseTime: 8.195250988006592
```

---

