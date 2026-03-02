FROM rust:1.86-slim
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY Cargo.toml ./
COPY src ./src
CMD ["cargo", "test", "--quiet"]
