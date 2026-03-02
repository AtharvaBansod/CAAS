using System.Threading;
using Caas.Sdk;
using Xunit;

namespace Caas.Sdk.Tests;

public class CaasDotnetSdkTests
{
    [Fact]
    public void CanonicalHeaders_ShouldContainApiKeyAndProjectId()
    {
        var sdk = new CaasDotnetSdk("http://gateway:3000", "api-key", "project-1");
        var headers = sdk.CanonicalHeaders();

        Assert.Equal("api-key", headers["x-api-key"]);
        Assert.Equal("project-1", headers["x-project-id"]);
        Assert.True(headers["x-correlation-id"].StartsWith("sdkdotnet_"));
    }

    [Fact]
    public void ErrorHierarchy_CodesAreStable()
    {
        var authErr = new SdkAuthException("fail", 401);
        Assert.Equal("AUTH_ERROR", authErr.Code);
        Assert.Equal(401, authErr.StatusCode);
        Assert.False(authErr.Retryable);

        var throttleErr = new SdkThrottleException("rate", 5000);
        Assert.Equal("THROTTLE_ERROR", throttleErr.Code);
        Assert.True(throttleErr.Retryable);
        Assert.Equal(5000, throttleErr.RetryAfterMs);

        var serverErr = new SdkServerException("down", 502);
        Assert.Equal("SERVER_ERROR", serverErr.Code);
        Assert.True(serverErr.Retryable);

        var netErr = new SdkNetworkException("timeout");
        Assert.Equal("NETWORK_ERROR", netErr.Code);
        Assert.True(netErr.Retryable);

        var circuitErr = new SdkCircuitOpenException(30000);
        Assert.Equal("CIRCUIT_OPEN", circuitErr.Code);
        Assert.False(circuitErr.Retryable);
    }

    [Fact]
    public void ValidationError_CodesAreStable()
    {
        var valErr = new SdkValidationException("bad payload", 400);
        Assert.Equal("VALIDATION_ERROR", valErr.Code);
        Assert.Equal(400, valErr.StatusCode);
        Assert.False(valErr.Retryable);

        var valErr422 = new SdkValidationException("unprocessable", 422);
        Assert.Equal(422, valErr422.StatusCode);
    }

    [Fact]
    public void TimeoutError_CodesAreStable()
    {
        var timeoutErr = new SdkTimeoutException("timed out", 10000);
        Assert.Equal("TIMEOUT_ERROR", timeoutErr.Code);
        Assert.Null(timeoutErr.StatusCode);
        Assert.True(timeoutErr.Retryable);
        Assert.Equal(10000, timeoutErr.TimeoutMs);
    }

    [Fact]
    public void CircuitBreaker_OpensAfterThreshold()
    {
        var cb = new CircuitBreaker(threshold: 3, resetMs: 100);
        Assert.Equal("closed", cb.State);
        cb.RecordFailure();
        cb.RecordFailure();
        cb.RecordFailure();
        Assert.Equal("open", cb.State);
        Assert.False(cb.AllowRequest());
    }

    [Fact]
    public void CircuitBreaker_ResetsOnSuccess()
    {
        var cb = new CircuitBreaker(threshold: 2, resetMs: 100);
        cb.RecordFailure();
        cb.RecordFailure();
        Assert.Equal("open", cb.State);
        // Wait for reset timeout
        Thread.Sleep(150);
        Assert.Equal("half-open", cb.State);
        Assert.True(cb.AllowRequest());
        cb.RecordSuccess();
        Assert.Equal("closed", cb.State);
    }

    [Fact]
    public void SdkCircuitState_InitiallyClosed()
    {
        var sdk = new CaasDotnetSdk("http://gateway:3000", "api-key", "project-1");
        Assert.Equal("closed", sdk.CircuitState);
    }

    [Fact]
    public void AllErrorTypes_InheritFromSdkException()
    {
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkNetworkException)));
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkTimeoutException)));
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkAuthException)));
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkValidationException)));
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkThrottleException)));
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkServerException)));
        Assert.True(typeof(SdkException).IsAssignableFrom(typeof(SdkCircuitOpenException)));
    }

    [Fact]
    public void ErrorBranching_InstanceOfWorks()
    {
        SdkException err = new SdkAuthException("unauthorized", 401);
        Assert.IsType<SdkAuthException>(err);
        Assert.True(err is SdkAuthException);
        Assert.False(err is SdkThrottleException);

        SdkException throttle = new SdkThrottleException("limited", 1000);
        Assert.IsType<SdkThrottleException>(throttle);
    }

    [Fact]
    public void CorrelationId_StartsWithSdkPrefix()
    {
        var sdk = new CaasDotnetSdk("http://gateway:3000", "api-key", "project-1");
        var headers = sdk.CanonicalHeaders();
        Assert.StartsWith("sdkdotnet_", headers["x-correlation-id"]);
    }
}
