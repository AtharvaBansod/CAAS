#!/bin/bash
# MinIO Bucket Initialization Script
# Creates the caas-media bucket for media storage

set -e

echo "=========================================="
echo "MinIO Bucket Initialization"
echo "=========================================="
echo ""

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
for i in {1..60}; do
  if curl -f http://minio:9000/minio/health/live > /dev/null 2>&1; then
    echo "✓ MinIO is ready"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "✗ Timeout waiting for MinIO"
    exit 1
  fi
  sleep 2
done

echo ""
echo "Configuring MinIO client..."

# Configure mc (MinIO Client)
mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin}

echo ""
echo "Creating bucket..."

# Create bucket if it doesn't exist
mc mb myminio/caas-media --ignore-existing

echo "✓ Bucket 'caas-media' created successfully"

# Optional: Set public policy for testing (in production, use signed URLs)
# mc anonymous set download myminio/caas-media

echo ""
echo "=========================================="
echo "MinIO Initialization Complete!"
echo "=========================================="
echo ""

