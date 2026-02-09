# Phase 3 API Quick Reference

## WebRTC

### Get ICE Servers
```javascript
socket.emit('webrtc:get-ice-servers', (response) => {
  console.log(response.ice_servers);
});
```

### Exchange SDP
```javascript
// Send offer
socket.emit('webrtc:offer', {
  target_user_id: 'user-123',
  sdp: { type: 'offer', sdp: '...' },
  call_id: callId
});

// Send answer
socket.emit('webrtc:answer', {
  target_user_id: 'user-123',
  sdp: { type: 'answer', sdp: '...' },
  call_id: callId
});

// Send ICE candidate
socket.emit('webrtc:ice-candidate', {
  target_user_id: 'user-123',
  candidate: { candidate: '...', sdpMid: '0', sdpMLineIndex: 0 },
  call_id: callId
});
```

### 1:1 Calls
```javascript
// Initiate
socket.emit('call:initiate', {
  callee_id: 'user-123',
  media_type: 'video'  // or 'audio'
}, (response) => {
  console.log('Call ID:', response.call_id);
});

// Answer
socket.emit('call:answer', { call_id: callId });

// Reject
socket.emit('call:reject', { call_id: callId, reason: 'busy' });

// Hangup
socket.emit('call:hangup', { call_id: callId });
```

### Group Calls
```javascript
// Create group call
const groupCall = await groupCallManager.createGroupCall(
  creatorId,
  ['user-1', 'user-2', 'user-3'],
  'video',
  tenantId
);

// Add participant
await groupCallManager.addParticipant(callId, newUserId);

// Remove participant
await groupCallManager.removeParticipant(callId, userId);
```

### Quality Reporting
```javascript
// Report quality metrics
await callQualityTracker.recordQualityReport({
  call_id: callId,
  user_id: userId,
  timestamp: new Date(),
  latency_ms: 150,
  packet_loss_percentage: 2.5,
  jitter_ms: 20,
  bitrate_kbps: 500,
  frame_rate: 30,
  resolution: '1280x720'
});

// Get analytics
const analytics = await callQualityTracker.getCallAnalytics(callId, duration, participantCount);
```

## Presence

### Set Status
```javascript
socket.emit('presence:set-status', {
  status: 'online',  // 'online' | 'away' | 'busy' | 'offline'
  custom_status: 'In a meeting'
});
```

### Subscribe to Presence
```javascript
socket.emit('presence:subscribe', {
  user_ids: ['user-1', 'user-2', 'user-3']
});

socket.on('presence:status-changed', (data) => {
  console.log(`${data.user_id} is now ${data.status}`);
});
```

### Batch Presence (with caching)
```javascript
const cachedPresences = await presenceCache.getBatchCachedPresence([
  'user-1', 'user-2', 'user-3'
]);
```

### Analytics
```javascript
const metrics = await presenceAnalytics.getCurrentMetrics();
// { online_users: 350, away_users: 50, busy_users: 25, offline_users: 75, peak_online_count: 450 }

const userActivity = await presenceAnalytics.getUserActivityMetrics(userId);
// { total_sessions: 42, total_online_time_minutes: 1250, average_session_duration_minutes: 30 }
```

## Typing Indicators

### Basic Typing
```javascript
// Start typing
socket.emit('typing:start', { conversation_id: convId });

// Stop typing
socket.emit('typing:stop', { conversation_id: convId });
```

### Aggregated Typing
```javascript
const status = await typingAggregator.getAggregatedStatus(conversationId, currentUserId);
console.log(status.display_text);
// "Alice and Bob are typing..."
```

### Analytics
```javascript
const metrics = await typingAnalytics.getMetrics(conversationId);
// { total_typing_events: 250, average_typing_duration_ms: 5000 }
```

## Read Receipts with Privacy

### Update Privacy Settings
```javascript
await receiptPrivacyManager.updateSettings({
  user_id: userId,
  tenant_id: tenantId,
  read_receipts_enabled: true,
  delivery_receipts_enabled: true,
  typing_indicators_enabled: false  // Hide typing from others
});
```

### Send Receipt (respects privacy)
```javascript
const canSend = await receiptPrivacyManager.canSendReadReceipt(userId, tenantId);
if (canSend) {
  socket.emit('message:read', { message_id: msgId });
}
```

## Notifications

### Push Notifications
```javascript
const pushService = new PushNotificationService();

// Send to device
await pushService.sendToDevice(deviceToken, {
  id: 'notif-123',
  user_id: userId,
  tenant_id: tenantId,
  type: 'message',
  title: 'New Message',
  body: 'Alice: Hey there!',
  priority: 'high',
  read: false,
  created_at: new Date()
});

// Batch send
await pushService.sendToDevices([token1, token2, token3], notification);
```

### Preferences
```javascript
await notificationPreferences.updatePreferences({
  user_id: userId,
  tenant_id: tenantId,
  push_enabled: true,
  in_app_enabled: true,
  email_enabled: false,
  notification_types: {
    messages: true,
    calls: true,
    mentions: true,
    system: false
  },
  quiet_hours: {
    enabled: true,
    start_hour: 22,  // 10 PM
    end_hour: 8,     // 8 AM
    timezone: 'America/New_York'
  },
  priority_filter: 'all'  // 'all' | 'high_only' | 'urgent_only'
});
```

### Kafka Consumer Usage
```javascript
const consumer = new NotificationConsumer(kafka, io, redis);
await consumer.start();

// Producer sends notifications to Kafka
await producer.send({
  topic: 'notifications',
  messages: [{
    value: JSON.stringify({
      type: 'notification',
      payload: notification,
      device_tokens: userDevices
    })
  }]
});
```

## Commands

```powershell
# Start all services
.\start.ps1

# Test Phase 3
.\test-phase3.ps1

# Stop all services
.\stop.ps1

# Check logs
docker logs caas-socket-1 --tail 100

# Service health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Socket Namespaces

- `/chat` - Chat messages, rooms, receipts, typing
- `/presence` - User presence tracking
- `/webrtc` - WebRTC signaling & calls

## Connection Example

```javascript
const socket = io('http://localhost:3002/webrtc', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to WebRTC namespace');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```
