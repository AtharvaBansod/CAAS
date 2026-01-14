# Flow Diagram: E2E Encryption Flow

> **Related Roadmaps**: 
> - [Auth, Authorization & Security](../roadmaps/3_AuthAutorizeSecurity.md)
> - [Socket Service](../roadmaps/5_sockets.md)

---

## Overview

This diagram illustrates the complete end-to-end encryption flow from key generation to message encryption/decryption.

---

## 1. Initial Key Setup

```mermaid
sequenceDiagram
    participant User as User Device
    participant Client as Client SDK
    participant Server as CAAS Server
    participant DB as Key Storage

    Note over User,DB: User Registration & Key Generation

    User->>Client: Register/Login
    Client->>Client: Generate Identity Key Pair
    Client->>Client: Generate Signed Pre-Key
    Client->>Client: Generate 100 One-Time Pre-Keys
    Client->>Client: Encrypt private keys with user password
    
    Client->>Server: Upload Key Bundle (public keys only)
    Server->>Server: Validate signatures
    Server->>DB: Store public key bundle
    Server-->>Client: Key registration confirmed
    
    Client->>User: Store encrypted private keys locally
```

---

## 2. Session Establishment (X3DH)

```mermaid
sequenceDiagram
    participant Alice as Alice (Sender)
    participant Server as CAAS Server
    participant Bob as Bob (Recipient)

    Note over Alice,Bob: First Message - Session Setup

    Alice->>Server: Request Bob's key bundle
    Server-->>Alice: {IK_B, SPK_B, OTK_B (if available)}
    
    Alice->>Alice: Verify SPK_B signature
    Alice->>Alice: Generate ephemeral key EK_A
    
    rect rgb(240, 240, 255)
        Note over Alice: X3DH Calculation
        Alice->>Alice: DH1 = DH(IK_A, SPK_B)
        Alice->>Alice: DH2 = DH(EK_A, IK_B)
        Alice->>Alice: DH3 = DH(EK_A, SPK_B)
        Alice->>Alice: DH4 = DH(EK_A, OTK_B)
        Alice->>Alice: SK = KDF(DH1 || DH2 || DH3 || DH4)
    end
    
    Alice->>Alice: Initialize Double Ratchet with SK
    Alice->>Alice: Encrypt first message
    
    Alice->>Server: Send encrypted message + {IK_A, EK_A, OTK_id}
    Server->>Bob: Forward message
    
    Bob->>Bob: Load private keys
    Bob->>Bob: Perform same X3DH calculation
    Bob->>Bob: Initialize Double Ratchet
    Bob->>Bob: Decrypt message
    
    Server->>Server: Delete used OTK_B
```

---

## 3. Message Encryption (Double Ratchet)

```mermaid
flowchart TD
    subgraph Sender["Sender (Alice)"]
        A1[Prepare Message] --> A2{First message<br/>in chain?}
        A2 -->|Yes| A3[DH Ratchet Step]
        A2 -->|No| A4[Symmetric Ratchet]
        A3 --> A5[Generate new DH key pair]
        A5 --> A6[Compute new Root Key]
        A6 --> A7[Derive new Chain Key]
        A4 --> A8[Derive Message Key from Chain Key]
        A7 --> A8
        A8 --> A9[Encrypt message with AES-256-GCM]
        A9 --> A10[Create message envelope]
    end

    subgraph Envelope["Encrypted Message"]
        E1[Header:<br/>- Sender DH Public Key<br/>- Previous chain length<br/>- Message number]
        E2[Body:<br/>- Encrypted content]
        E3[MAC:<br/>- Authentication tag]
    end

    A10 --> E1
    A10 --> E2
    A10 --> E3

    subgraph Recipient["Recipient (Bob)"]
        B1[Receive message] --> B2{New DH key<br/>in header?}
        B2 -->|Yes| B3[DH Ratchet Step]
        B2 -->|No| B4[Use existing chain]
        B3 --> B5[Compute new Root Key]
        B5 --> B6[Derive Chain Key]
        B4 --> B7[Derive Message Key]
        B6 --> B7
        B7 --> B8[Decrypt with AES-256-GCM]
        B8 --> B9[Verify MAC]
        B9 --> B10[Display message]
    end

    E1 --> B1
    E2 --> B1
    E3 --> B1
```

---

## 4. Multi-Device Message Distribution

```mermaid
flowchart LR
    subgraph Sender["Sender (User A)"]
        A1[Device A1]
    end

    subgraph Server["CAAS Server"]
        S1[Message Router]
        S2[(Encrypted<br/>Messages)]
    end

    subgraph Recipient["Recipient (User B)"]
        B1[Device B1]
        B2[Device B2]
        B3[Device B3]
    end

    A1 -->|"Encrypt for B1"| S1
    A1 -->|"Encrypt for B2"| S1
    A1 -->|"Encrypt for B3"| S1
    
    S1 --> S2
    
    S2 -->|"Msg encrypted<br/>for B1"| B1
    S2 -->|"Msg encrypted<br/>for B2"| B2
    S2 -->|"Msg encrypted<br/>for B3"| B3

    style A1 fill:#90EE90
    style B1 fill:#87CEEB
    style B2 fill:#87CEEB
    style B3 fill:#87CEEB
```

---

## 5. Group Encryption (Sender Keys)

```mermaid
sequenceDiagram
    participant Alice
    participant Server
    participant Bob
    participant Carol

    Note over Alice,Carol: Group Setup

    Alice->>Alice: Generate Sender Key for group
    Alice->>Bob: Send Sender Key (via pairwise E2E)
    Alice->>Carol: Send Sender Key (via pairwise E2E)
    
    Bob->>Bob: Generate Sender Key for group
    Bob->>Alice: Send Sender Key (via pairwise E2E)
    Bob->>Carol: Send Sender Key (via pairwise E2E)

    Note over Alice,Carol: Group Message

    Alice->>Alice: Encrypt with Alice's Sender Key
    Alice->>Server: Send encrypted message (one copy)
    Server->>Bob: Forward message
    Server->>Carol: Forward message
    
    Bob->>Bob: Decrypt with Alice's Sender Key
    Carol->>Carol: Decrypt with Alice's Sender Key
```

---

## 6. Key Rotation Flow

```mermaid
flowchart TD
    subgraph Trigger["Rotation Triggers"]
        T1[Scheduled<br/>Monthly]
        T2[Security Event]
        T3[User Request]
        T4[Device Removed]
    end

    subgraph Process["Rotation Process"]
        P1[Generate new key pair]
        P2[Sign with old identity key]
        P3[Upload to server]
        P4[Notify active sessions]
        P5[Re-establish sessions]
        P6[Archive old key]
        P7[Delete after grace period]
    end

    T1 --> P1
    T2 --> P1
    T3 --> P1
    T4 --> P1

    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7

    style T2 fill:#FFB6C1
```

---

## 7. Key Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT DEVICE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    IndexedDB (Encrypted)                  │   │
│  │                                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │  Identity Key   │  │       Session Store         │   │   │
│  │  │  (encrypted)    │  │  - Per-contact sessions     │   │   │
│  │  └─────────────────┘  │  - Root keys, chain keys    │   │   │
│  │                       └─────────────────────────────┘   │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │   Pre-Keys      │  │       Message Keys          │   │   │
│  │  │   (encrypted)   │  │  (derived, ephemeral)       │   │   │
│  │  └─────────────────┘  └─────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Master Key derived from: User Password + Device Salt (Argon2)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      CAAS SERVER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Public Keys Only - Server Cannot Decrypt Messages!             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MongoDB                                │   │
│  │                                                           │   │
│  │  users.key_bundle: {                                     │   │
│  │    identity_key: "PUBLIC KEY",                           │   │
│  │    signed_pre_key: { id, public, signature },            │   │
│  │    one_time_pre_keys: [{ id, public }, ...]              │   │
│  │  }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Properties Summary

| Property | How Achieved |
|----------|--------------|
| **Confidentiality** | AES-256-GCM encryption |
| **Integrity** | GCM authentication tag |
| **Authentication** | Digital signatures on pre-keys |
| **Forward Secrecy** | DH ratchet on each exchange |
| **Post-Compromise Security** | Key rotation & ratcheting |
| **Deniability** | No third-party verifiable signatures |

---

## Related Documents

- [Signal Protocol Implementation](../rnd/signal-protocol-implementation.md)
- [E2E Key Management Deep Dive](../deepDive/authSecurity/e2e-key-management.md)
