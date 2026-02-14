declare module 'opossum' {
  interface Options {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    name?: string;
  }

  interface CircuitBreakerInstance {
    fire(...args: any[]): Promise<any>;
    open(): void;
    close(): void;
    halfOpen(): void;
    fallback(fn: (...args: any[]) => any): void;
    on(event: string, fn: (...args: any[]) => void): void;
  }

  interface CircuitBreakerConstructor {
    new (fn: (...args: any[]) => Promise<any>, options?: Options): CircuitBreakerInstance;
  }

  const CircuitBreaker: CircuitBreakerConstructor;
  export type CircuitBreakerInstance = InstanceType<CircuitBreakerConstructor>;
  export default CircuitBreaker;
}
