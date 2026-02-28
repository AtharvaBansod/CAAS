FROM rust:1.75-slim
WORKDIR /workspace
COPY Cargo.toml ./
COPY src ./src
CMD ["cargo", "test", "--quiet"]
