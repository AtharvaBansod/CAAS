# WebRTC Call Flow

> Visual flow for voice/video call establishment and media streaming.

---

## Flow Diagram

```mermaid
sequenceDiagram
    participant A as Caller
    participant S as Signaling Server
    participant B as Callee
    participant STUN as STUN Server
    participant TURN as TURN Server
    
    Note over A: User initiates call
    A->>S: call:initiate { targetUserId, callType }
    S->>B: call:incoming { callerId, callType }
    
    Note over B: User answers
    B->>S: call:accept { callId }
    S->>A: call:accepted
    
    Note over A,B: ICE Candidate Gathering
    A->>STUN: Request server-reflexive candidate
    STUN->>A: srflx candidate
    A->>S: ice:candidate { candidate }
    S->>B: ice:candidate (relay)
    
    B->>STUN: Request server-reflexive candidate
    STUN->>B: srflx candidate
    B->>S: ice:candidate { candidate }
    S->>A: ice:candidate (relay)
    
    Note over A,B: SDP Exchange (Offer/Answer)
    A->>A: Create offer
    A->>S: signal:offer { sdp }
    S->>B: signal:offer (relay)
    
    B->>B: Create answer
    B->>S: signal:answer { sdp }
    S->>A: signal:answer (relay)
    
    Note over A,B: Peer Connection Established
    A-->>B: Direct P2P media stream
    
    alt P2P fails (NAT traversal issue)
        A->>TURN: Relay media
        TURN->>B: Relay media
    end
    
    Note over A: End call
    A->>S: call:end { callId }
    S->>B: call:ended
```

---

## Call States

```typescript
type CallState = 
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed';

interface Call {
  id: string;
  state: CallState;
  type: 'audio' | 'video';
  participants: Participant[];
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}
```

---

## RTCPeerConnection Setup

```typescript
async function createPeerConnection(): Promise<RTCPeerConnection> {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.caas.io:3478' },
      {
        urls: 'turn:turn.caas.io:3478',
        username: turnCredentials.username,
        credential: turnCredentials.password
      }
    ]
  });
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice:candidate', {
        callId,
        candidate: event.candidate
      });
    }
  };
  
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };
  
  return pc;
}
```

---

## Media Handling

```typescript
async function startLocalMedia(type: 'audio' | 'video') {
  const constraints = {
    audio: true,
    video: type === 'video' ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    } : false
  };
  
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });
  
  return stream;
}
```

---

## Related Documents
- [Socket Authentication Flow](./socket-auth-flow.md)
- [Socket Service Roadmap](../roadmaps/5_sockets.md)
