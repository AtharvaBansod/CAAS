FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /workspace
COPY src ./src
COPY tests ./tests
RUN dotnet restore tests/Caas.Sdk.Tests/Caas.Sdk.Tests.csproj
CMD ["dotnet", "test", "tests/Caas.Sdk.Tests/Caas.Sdk.Tests.csproj", "--nologo", "--verbosity", "minimal"]
