# API SDK - HTTP Client Architecture

> **Parent Roadmap**: [API SDK](../../roadmaps/7_apiSdk.md)

---

## Overview

HTTP client implementation for the CAAS SDK, featuring automatic retry, request queuing, and type-safe API calls.

---

## Tasks

### 1. Client Architecture

#### 1.1 Core HTTP Client
```typescript
interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retry: RetryConfig;
  headers: Record<string, string>;
}

interface RetryConfig {
  attempts: number;
  backoff: 'linear' | 'exponential';
  retryOn: number[];        // Status codes to retry
  maxDelay: number;
}

class HttpClient {
  private config: HttpClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  
  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000,
      retry: {
        attempts: 3,
        backoff: 'exponential',
        retryOn: [408, 429, 500, 502, 503, 504],
        maxDelay: 30000
      },
      ...config
    };
  }
  
  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    let request = this.buildRequest(options);
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      request = await interceptor(request);
    }
    
    // Execute with retry
    let response = await this.executeWithRetry(request);
    
    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }
    
    return response;
  }
}
```
- [ ] Configuration management
- [ ] Request building
- [ ] Interceptor support
- [ ] Generic type safety

#### 1.2 Request Options
```typescript
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, string | number>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}
```

### 2. Retry Logic

#### 2.1 Retry with Backoff
```typescript
async executeWithRetry<T>(request: Request): Promise<ApiResponse<T>> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= this.config.retry.attempts; attempt++) {
    try {
      const response = await this.execute(request);
      
      // Check if we should retry based on status
      if (this.shouldRetry(response.status, attempt)) {
        await this.delay(attempt);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      if (!this.isRetryableError(error) || attempt === this.config.retry.attempts) {
        throw error;
      }
      
      await this.delay(attempt);
    }
  }
  
  throw lastError!;
}

private calculateDelay(attempt: number): number {
  const { backoff, maxDelay } = this.config.retry;
  
  if (backoff === 'exponential') {
    // 100ms, 200ms, 400ms, 800ms...
    const delay = 100 * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }
  
  // Linear: 100ms, 200ms, 300ms...
  return Math.min(100 * attempt, maxDelay);
}

private shouldRetry(status: number, attempt: number): boolean {
  return (
    attempt < this.config.retry.attempts &&
    this.config.retry.retryOn.includes(status)
  );
}
```
- [ ] Exponential backoff
- [ ] Linear backoff option
- [ ] Max delay cap
- [ ] Attempt counting

#### 2.2 Rate Limit Handling
```typescript
async handleRateLimitResponse(response: Response): Promise<never> {
  const retryAfter = response.headers.get('Retry-After');
  
  if (retryAfter) {
    const delay = parseInt(retryAfter, 10) * 1000;
    await this.delay(delay);
    throw new RetryableError('Rate limited, retrying...');
  }
  
  throw new RateLimitError('Rate limit exceeded');
}
```
- [ ] Retry-After header parsing
- [ ] Automatic retry on 429
- [ ] Rate limit event emission

### 3. Request Interceptors

#### 3.1 Interceptor Types
```typescript
type RequestInterceptor = (request: Request) => Promise<Request> | Request;
type ResponseInterceptor = (response: ApiResponse) => Promise<ApiResponse> | ApiResponse;

class HttpClient {
  use(interceptor: {
    request?: RequestInterceptor;
    response?: ResponseInterceptor;
  }): void {
    if (interceptor.request) {
      this.requestInterceptors.push(interceptor.request);
    }
    if (interceptor.response) {
      this.responseInterceptors.push(interceptor.response);
    }
  }
}
```

#### 3.2 Built-in Interceptors
```typescript
// Authentication interceptor
const authInterceptor: RequestInterceptor = async (request) => {
  const token = await tokenManager.getAccessToken();
  
  return {
    ...request,
    headers: {
      ...request.headers,
      'Authorization': `Bearer ${token}`
    }
  };
};

// Request ID interceptor
const requestIdInterceptor: RequestInterceptor = (request) => ({
  ...request,
  headers: {
    ...request.headers,
    'X-Request-ID': generateUUID()
  }
});

// Logging interceptor
const loggingInterceptor = {
  request: (req) => {
    console.log(`[API] ${req.method} ${req.path}`);
    return req;
  },
  response: (res) => {
    console.log(`[API] Response: ${res.status}`);
    return res;
  }
};
```
- [ ] Auth header injection
- [ ] Request ID generation
- [ ] Logging interceptor
- [ ] Timing interceptor

### 4. Request Cancellation

#### 4.1 AbortController Integration
```typescript
class CancellableRequest<T> {
  private controller: AbortController;
  private promise: Promise<ApiResponse<T>>;
  
  constructor(executor: (signal: AbortSignal) => Promise<ApiResponse<T>>) {
    this.controller = new AbortController();
    this.promise = executor(this.controller.signal);
  }
  
  cancel(): void {
    this.controller.abort();
  }
  
  then<R>(onFulfilled: (value: ApiResponse<T>) => R): Promise<R> {
    return this.promise.then(onFulfilled);
  }
}

// Usage
const request = client.get<User>('/users/me');
// Later...
request.cancel();
```

#### 4.2 Request Deduplication
```typescript
class RequestDeduper {
  private pending = new Map<string, Promise<any>>();
  
  async dedupe<T>(key: string, executor: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    const promise = executor().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
}

// Usage: Multiple calls to same endpoint share one request
const deduper = new RequestDeduper();
const user = await deduper.dedupe('user:123', () => 
  client.get('/users/123')
);
```
- [ ] Abort controller wrapper
- [ ] Request deduplication
- [ ] In-flight request tracking

### 5. Error Handling

#### 5.1 Error Classes
```typescript
class CaasError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CaasError';
  }
}

class CaasNetworkError extends CaasError {
  constructor(message = 'Network error') {
    super(message, 'NETWORK_ERROR');
  }
}

class CaasValidationError extends CaasError {
  constructor(
    message: string,
    public errors: ValidationError[]
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

class CaasAuthError extends CaasError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

class CaasRateLimitError extends CaasError {
  constructor(
    message = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT', 429);
  }
}
```

#### 5.2 Error Transformation
```typescript
private transformError(response: Response, body: any): CaasError {
  switch (response.status) {
    case 400:
      return new CaasValidationError(
        body.message || 'Validation failed',
        body.errors || []
      );
    case 401:
      return new CaasAuthError(body.message);
    case 403:
      return new CaasError(body.message || 'Forbidden', 'FORBIDDEN', 403);
    case 404:
      return new CaasError(body.message || 'Not found', 'NOT_FOUND', 404);
    case 429:
      return new CaasRateLimitError(
        body.message,
        parseInt(response.headers.get('Retry-After') || '0', 10)
      );
    default:
      return new CaasError(
        body.message || 'Server error',
        'SERVER_ERROR',
        response.status
      );
  }
}
```
- [ ] Error class hierarchy
- [ ] Status code mapping
- [ ] Error context preservation

### 6. Response Handling

#### 6.1 Response Type
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}
```

#### 6.2 Response Transformation
```typescript
private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  
  let data: T;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text() as unknown as T;
  }
  
  return {
    data,
    status: response.status,
    headers: response.headers,
    meta: {
      rateLimit: {
        limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10),
        remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10),
        reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10)
      }
    }
  };
}
```
- [ ] JSON parsing
- [ ] Header extraction
- [ ] Pagination metadata
- [ ] Rate limit metadata

---

## Usage Example

```typescript
const client = new HttpClient({
  baseUrl: 'https://api.caas.io/v1',
  apiKey: 'your-api-key',
  timeout: 30000
});

// Add interceptors
client.use(authInterceptor);
client.use(loggingInterceptor);

// Make requests
const response = await client.request<User>({
  method: 'GET',
  path: '/users/me'
});

console.log(response.data);
```

---

## Related Documents

- [Real-time Event System](./realtime-events.md)
- [SDK Authentication Flow](../../flowdiagram/sdk-auth-flow.md)
