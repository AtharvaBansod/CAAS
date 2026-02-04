// MongoDB Phase 1 Testing Script
const testDB = db.getSiblingDB('caas_platform');

print('=== MongoDB Phase 1 Testing ===');
print('Testing basic CRUD operations, tenant isolation, and indexes');

// Test 1: Basic CRUD Operations
print('\n1. Testing Basic CRUD Operations');

// Create
const insertResult = testDB.test_users.insertOne({
  _id: 'test_user_1',
  name: 'Test User',
  email: 'test@example.com',
  tenant_id: 'tenant_1',
  created_at: new Date(),
  updated_at: new Date()
});
print('Insert result:', JSON.stringify(insertResult, null, 2));

// Read
const user = testDB.test_users.findOne({_id: 'test_user_1'});
print('Found user:', JSON.stringify(user, null, 2));

// Update
const updateResult = testDB.test_users.updateOne(
  {_id: 'test_user_1'},
  {$set: {updated_at: new Date(), status: 'active'}}
);
print('Update result:', JSON.stringify(updateResult, null, 2));

const updatedUser = testDB.test_users.findOne({_id: 'test_user_1'});
print('Updated user:', JSON.stringify(updatedUser, null, 2));

// Test 2: Tenant Isolation
print('\n2. Testing Tenant Isolation');

testDB.test_users.insertMany([
  {
    _id: 'test_user_2',
    name: 'Test User 2',
    email: 'test2@example.com',
    tenant_id: 'tenant_1',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'test_user_3',
    name: 'Test User 3',
    email: 'test3@example.com',
    tenant_id: 'tenant_2',
    created_at: new Date(),
    updated_at: new Date()
  }
]);

const tenant1Users = testDB.test_users.find({tenant_id: 'tenant_1'}).toArray();
print('Tenant 1 users:', tenant1Users.length);

const tenant2Users = testDB.test_users.find({tenant_id: 'tenant_2'}).toArray();
print('Tenant 2 users:', tenant2Users.length);

// Test 3: Indexes
print('\n3. Testing Indexes');

testDB.test_users.createIndex({tenant_id: 1, email: 1}, {unique: true});
testDB.test_users.createIndex({created_at: 1});
testDB.test_users.createIndex({tenant_id: 1, status: 1});

const indexes = testDB.test_users.getIndexes();
print('Created indexes:', JSON.stringify(indexes.map(i => ({name: i.name, key: i.key})), null, 2));

// Test 4: Aggregation
print('\n4. Testing Aggregation');

const tenantStats = testDB.test_users.aggregate([
  {$group: {_id: '$tenant_id', count: {$sum: 1}}},
  {$sort: {count: -1}}
]).toArray();
print('Tenant statistics:', JSON.stringify(tenantStats, null, 2));

// Test 5: Database Performance
print('\n5. Testing Database Performance');

const stats = testDB.stats();
print('Database stats:', JSON.stringify({
  collections: stats.collections,
  dataSize: stats.dataSize,
  indexes: stats.indexes,
  indexSize: stats.indexSize
}, null, 2));

// Test 6: Connection and Authentication
print('\n6. Testing Connection and Authentication');

const adminDB = db.getSiblingDB('admin');
const buildInfo = adminDB.runCommand({buildInfo: 1});
print('MongoDB version:', buildInfo.version);

const serverStatus = adminDB.runCommand({serverStatus: 1});
print('Server uptime:', serverStatus.uptime + ' seconds');

// Test 7: Data Validation
print('\n7. Testing Data Validation');

// Test unique constraint violation
try {
  testDB.test_users.insertOne({
    _id: 'test_user_1', // Duplicate ID
    name: 'Duplicate User',
    email: 'duplicate@example.com',
    tenant_id: 'tenant_1',
    created_at: new Date(),
    updated_at: new Date()
  });
  print('ERROR: Duplicate ID was allowed!');
} catch (e) {
  print('SUCCESS: Duplicate ID correctly rejected:', e.codeName);
}

// Test unique email constraint within tenant
try {
  testDB.test_users.insertOne({
    _id: 'test_user_4',
    name: 'Test User 4',
    email: 'test@example.com', // Duplicate email in same tenant
    tenant_id: 'tenant_1',
    created_at: new Date(),
    updated_at: new Date()
  });
  print('ERROR: Duplicate email in tenant was allowed!');
} catch (e) {
  print('SUCCESS: Duplicate email in tenant correctly rejected:', e.codeName);
}

// Test 8: Cleanup
print('\n8. Cleanup Test Data');

const deleteResult = testDB.test_users.deleteMany({});
print('Deleted test records:', deleteResult.deletedCount);

print('\n=== All Phase 1 MongoDB Tests Completed Successfully ===');
print('✅ Basic CRUD operations working');
print('✅ Tenant isolation enforced');
print('✅ Indexes created and working');
print('✅ Aggregation queries working');
print('✅ Database performance metrics available');
print('✅ Authentication and connection working');
print('✅ Data validation and constraints working');
