#!/bin/bash
# Kafka Topics Initialization Script
# NOTE: This script is not used by docker-compose.yml
# Topic creation is handled directly in start.ps1 using docker exec commands
# This script can be used for manual topic creation if needed
# Creates all required topics for CAAS Platform

set -e

echo "=========================================="
echo "Kafka Topics Initialization"
echo "=========================================="
echo ""

# Wait for Kafka to be ready
echo "Waiting for Kafka cluster to be ready..."
for i in {1..60}; do
  if kafka-broker-api-versions --bootstrap-server kafka-1:29092 > /dev/null 2>&1; then
    echo "✓ Kafka cluster is ready"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "✗ Timeout waiting for Kafka"
    exit 1
  fi
  sleep 2
done

echo ""
echo "Creating topics..."
echo ""

# Helper function to create topics
create_topic() {
  local topic=$1
  local partitions=$2
  local replication=$3
  shift 3
  local configs="$@"
  
  echo "Creating topic: $topic (partitions=$partitions, replication=$replication)"
  kafka-topics --bootstrap-server kafka-1:29092 \
    --create --if-not-exists \
    --topic "$topic" \
    --partitions "$partitions" \
    --replication-factor "$replication" \
    $configs || echo "  (topic may already exist)"
}

# Platform Topics
create_topic "platform.events" 3 3 --config retention.ms=604800000 --config compression.type=snappy
create_topic "platform.audit" 3 3 --config retention.ms=2592000000 --config compression.type=snappy
create_topic "platform.notifications" 3 3 --config retention.ms=604800000

# Internal Topics
create_topic "internal.dlq" 3 3 --config retention.ms=2592000000
create_topic "internal.retry" 3 3 --config retention.ms=604800000

# Auth Topics
create_topic "auth.revocation.events" 3 3 --config retention.ms=2592000000

# Event Topics
create_topic "events" 3 3 --config retention.ms=604800000
create_topic "messages" 3 3 --config retention.ms=604800000
create_topic "conversations" 3 3 --config retention.ms=604800000
create_topic "users" 3 3 --config retention.ms=604800000

# Media Topics
create_topic "media-processing" 3 3 --config retention.ms=604800000

# Messaging Events
create_topic "message-events" 3 3 --config retention.ms=604800000
create_topic "conversation-events" 3 3 --config retention.ms=604800000

# Socket/Chat Topics (Phase 3)
create_topic "chat.messages" 3 3 --config retention.ms=604800000
create_topic "chat.events" 3 3 --config retention.ms=604800000

# Notification Topics
create_topic "notifications" 3 3 --config retention.ms=604800000
create_topic "notifications.priority" 3 3 --config retention.ms=604800000

echo ""
echo "=========================================="
echo "Topics created successfully!"
echo "=========================================="
echo ""

# List all topics
echo "Available topics:"
kafka-topics --bootstrap-server kafka-1:29092 --list

echo ""
