#!/bin/bash

echo "🧪 Phase 1 Kafka Tests Starting..."
echo "=================================="

# Test 1: Check all containers are running
echo "📋 Test 1: Checking container status..."
docker-compose -f local/docker-compose-kafka-simple.yml ps

# Test 2: Verify Kafka broker health
echo ""
echo "🏥 Test 2: Kafka broker health check..."
docker exec caas-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Kafka broker is healthy"
else
    echo "❌ Kafka broker health check failed"
    exit 1
fi

# Test 3: Verify ZooKeeper connection
echo ""
echo "🦁 Test 3: ZooKeeper connection check..."
docker exec caas-zookeeper echo "ruok" | nc localhost 2181 | grep "imok" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ ZooKeeper is healthy"
else
    echo "❌ ZooKeeper health check failed"
    exit 1
fi

# Test 4: Verify Schema Registry
echo ""
echo "📝 Test 4: Schema Registry health check..."
curl -s http://localhost:8081/subjects > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Schema Registry is accessible"
else
    echo "❌ Schema Registry health check failed"
    exit 1
fi

# Test 5: Verify required topics exist
echo ""
echo "📂 Test 5: Checking required topics..."
REQUIRED_TOPICS=("platform.events" "platform.audit" "platform.notifications" "internal.dlq" "_schemas" "__consumer_offsets")

for topic in "${REQUIRED_TOPICS[@]}"; do
    docker exec caas-kafka kafka-topics --bootstrap-server localhost:9092 --list | grep "^$topic$" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Topic '$topic' exists"
    else
        echo "❌ Topic '$topic' missing"
        exit 1
    fi
done

# Test 6: Test message production and consumption
echo ""
echo "📤 Test 6: Message production and consumption..."
TEST_MESSAGE="Phase1Test_$(date +%s)"

# Produce message
echo "$TEST_MESSAGE" | docker exec -i caas-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic platform.events > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Message produced successfully"
else
    echo "❌ Message production failed"
    exit 1
fi

# Consume message
RECEIVED_MESSAGE=$(docker exec caas-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic platform.events --from-beginning --max-messages 1 2>/dev/null | tail -1)
if [ "$RECEIVED_MESSAGE" = "$TEST_MESSAGE" ]; then
    echo "✅ Message consumed successfully"
else
    echo "❌ Message consumption failed. Expected: $TEST_MESSAGE, Got: $RECEIVED_MESSAGE"
    exit 1
fi

# Test 7: Test topic creation with replication
echo ""
echo "🏗️ Test 7: Topic creation with proper configuration..."
docker exec caas-kafka kafka-topics --bootstrap-server localhost:9092 --create --topic test.phase1.chat --partitions 3 --replication-factor 1 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Topic created with correct configuration"
else
    echo "❌ Topic creation failed"
    exit 1
fi

# Test 8: Verify topic configuration
echo ""
echo "⚙️ Test 8: Topic configuration verification..."
TOPIC_CONFIG=$(docker exec caas-kafka kafka-configs --bootstrap-server localhost:9092 --entity-type topics --entity-name test.phase1.chat --describe)
echo "$TOPIC_CONFIG" | grep "partitions=3" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Topic has correct partition count"
else
    echo "❌ Topic partition count incorrect"
    exit 1
fi

# Test 9: Test consumer group functionality
echo ""
echo "👥 Test 9: Consumer group functionality..."
docker exec caas-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic test.phase1.chat --group test-phase1-group --from-beginning --max-messages 0 > /dev/null 2>&1 &
CONSUMER_PID=$!
sleep 2

# Check if consumer group is registered
docker exec caas-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list | grep "test-phase1-group" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Consumer group registered successfully"
else
    echo "❌ Consumer group registration failed"
    exit 1
fi

kill $CONSUMER_PID 2>/dev/null

# Test 10: Test schema registration
echo ""
echo "📋 Test 10: Schema Registry functionality..."
SCHEMA='{
  "type": "record",
  "name": "TestEvent",
  "namespace": "caas.test",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "timestamp", "type": "long"},
    {"name": "message", "type": "string"}
  ]
}'

curl -s -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data "$SCHEMA" \
  http://localhost:8081/subjects/test-phase1-value/versions > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Schema registered successfully"
else
    echo "❌ Schema registration failed"
    exit 1
fi

# Cleanup test artifacts
echo ""
echo "🧹 Cleaning up test artifacts..."
docker exec caas-kafka kafka-topics --bootstrap-server localhost:9092 --delete --topic test.phase1.chat > /dev/null 2>&1
curl -s -X DELETE http://localhost:8081/subjects/test-phase1-value > /dev/null 2>&1

echo ""
echo "🎉 All Phase 1 Kafka tests passed successfully!"
echo "=============================================="
echo ""
echo "📊 Summary:"
echo "- ✅ Kafka cluster operational"
echo "- ✅ ZooKeeper ensemble healthy"
echo "- ✅ Schema Registry functional"
echo "- ✅ All required topics created"
echo "- ✅ Message production/consumption working"
echo "- ✅ Topic management functional"
echo "- ✅ Consumer groups working"
echo "- ✅ Schema registration working"
echo ""
echo "🚀 Phase 1 Kafka implementation is complete and ready!"
