namespace Caas.Sdk;

public sealed class CaasDotnetSdk
{
    public string GatewayBaseUrl { get; }
    public string ApiKey { get; }
    public string? ProjectId { get; }

    public CaasDotnetSdk(string gatewayBaseUrl, string apiKey, string? projectId = null)
    {
        GatewayBaseUrl = gatewayBaseUrl;
        ApiKey = apiKey;
        ProjectId = projectId;
    }

    public Dictionary<string, string> CanonicalHeaders()
    {
        var headers = new Dictionary<string, string>
        {
            ["x-api-key"] = ApiKey,
            ["x-correlation-id"] = $"sdkdotnet_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}"
        };

        if (!string.IsNullOrWhiteSpace(ProjectId))
        {
            headers["x-project-id"] = ProjectId!;
        }

        return headers;
    }
}
