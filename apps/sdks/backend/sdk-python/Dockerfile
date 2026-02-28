FROM python:3.12-slim
WORKDIR /workspace
COPY pyproject.toml ./
COPY caas_sdk ./caas_sdk
COPY tests ./tests
RUN pip install --no-cache-dir -e .[test]
CMD ["pytest", "-q"]
