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
}
