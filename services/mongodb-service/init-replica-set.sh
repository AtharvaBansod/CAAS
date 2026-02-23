#!/bin/bash
# MongoDB Replica Set Initialization Script
# This script initializes the MongoDB replica set if not already initialized

echo "=========================================="
echo "MongoDB Replica Set Initialization"
echo "=========================================="

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 10

# Check if replica set is already initialized
RS_STATUS=$(mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval "try { rs.status().ok } catch(e) { 0 }")

if [ "$RS_STATUS" == "1" ]; then
    echo "✓ Replica set already initialized"
    mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval "rs.status().members.forEach(m => print('  - ' + m.name + ': ' + m.stateStr))"
else
    echo "Initializing replica set..."
    mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "
        rs.initiate({
            _id: 'caas-rs',
            members: [
                { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
                { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 },
                { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 }
            ]
        })
    "
    
    echo "Waiting for replica set to elect primary..."
    sleep 10
    
    echo "✓ Replica set initialized successfully"
    mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval "rs.status().members.forEach(m => print('  - ' + m.name + ': ' + m.stateStr))"
fi

echo "=========================================="
echo "Replica Set Initialization Complete"
echo "=========================================="
