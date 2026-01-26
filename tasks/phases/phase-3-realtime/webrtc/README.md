# WebRTC Signaling

## Overview

WebRTC signaling server for audio/video calls with support for 1:1 and group calls.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| 01-signaling-server.json | 4 | WEBRTC-001 to WEBRTC-004: Signaling, ICE, SDP exchange |
| 02-call-management.json | 4 | WEBRTC-005 to WEBRTC-008: Call lifecycle, group calls |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client A                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Local Media  │  │ RTCPeerConn  │  │   Socket     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Signaling
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Socket Service                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Signaling Handler                        │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────────┐  │   │
│  │  │ Offer  │  │ Answer │  │  ICE   │  │  Call Manager  │  │   │
│  │  └────────┘  └────────┘  └────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Signaling
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Client B                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Media (P2P)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TURN Server                                 │
│              (Relay for NAT traversal)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Signaling Flow

```
Client A                    Server                    Client B
    │                         │                           │
    ├── call_initiate ──────▶│                           │
    │                         ├── call_incoming ────────▶│
    │                         │◀── call_answer ──────────┤
    │◀── call_accepted ───────┤                           │
    │                         │                           │
    ├── sdp_offer ───────────▶│                           │
    │                         ├── sdp_offer ────────────▶│
    │                         │◀── sdp_answer ───────────┤
    │◀── sdp_answer ──────────┤                           │
    │                         │                           │
    ├── ice_candidate ───────▶│                           │
    │                         ├── ice_candidate ────────▶│
    │◀── ice_candidate ───────┤◀── ice_candidate ────────┤
    │                         │                           │
    │         ◀═══════════════ P2P Media ═══════════════▶│
```

## Dependencies

- SOCKET-009: Room management
- SOCKET-010: Broadcasting
- PRESENCE-001: User presence

## Environment Variables

```env
STUN_SERVERS=stun:stun.l.google.com:19302
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=xxx
TURN_CREDENTIAL=xxx
MAX_CALL_DURATION_MS=3600000
```
