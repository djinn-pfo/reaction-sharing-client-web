# iOS Backend API Reference Manual

## Overview

This document provides the complete API reference for iOS client implementation of the LoLup Lives Go reaction sharing platform. The backend consists of three main services:

1. **WebSocket Signaling Server** - Port 8080 (Go)
2. **Ion-SFU WebRTC Server** - Port 7000 (Docker)
3. **Redis Session Store** - Port 6379 (Docker)

## Connection Endpoints

### WebSocket Signaling
- **URL**: `ws://[server-ip]:8080/ws`
- **Protocol**: WebSocket with JSON messages
- **Connection**: Persistent connection required throughout session

### Ion-SFU WebRTC
- **URL**: `http://[server-ip]:7000`
- **ICE Ports**: UDP 5000-5200
- **STUN Server**: `stun:stun.l.google.com:19302`

### Health Check
- **URL**: `http://[server-ip]:8080/health`
- **Method**: GET
- **Response**: 200 OK with body "OK"

## WebSocket Message Format

All WebSocket messages follow this JSON structure:

```json
{
  "type": "string",           // Message type identifier
  "from": "string",           // Sender client ID (set by server)
  "to": "string",             // Target client ID (optional)
  "roomId": "string",         // Room identifier (optional)
  "data": {},                 // Message payload (optional)
  "userName": "string"        // User display name (optional)
}
```

## Client-to-Server Messages

### 1. Join Room
Joins a specific room and notifies other participants.

**Request:**
```json
{
  "type": "join-room",
  "data": {
    "roomId": "room-123",
    "userName": "John Doe"
  }
}
```

**Response:**
```json
{
  "type": "joined-room",
  "data": {
    "roomId": "room-123",
    "clientId": "uuid-generated-by-server"
  }
}
```

**Broadcast to Room:**
```json
{
  "type": "user-joined",
  "from": "client-uuid",
  "data": {
    "userId": "client-uuid",
    "userName": "John Doe"
  }
}
```

### 2. Leave Room
Leave the current room.

**Request:**
```json
{
  "type": "leave-room"
}
```

**Broadcast to Room:**
```json
{
  "type": "user-left",
  "from": "client-uuid",
  "data": {
    "userId": "client-uuid"
  }
}
```

### 3. WebRTC Offer
Send WebRTC offer to establish peer connection.

**Request:**
```json
{
  "type": "offer",
  "to": "target-client-id",
  "data": {
    "sdp": "v=0\\r\\no=- ..."  // SDP offer string
  }
}
```

**Forwarded to Target:**
```json
{
  "type": "offer",
  "from": "sender-client-id",
  "to": "target-client-id",
  "data": {
    "sdp": "v=0\\r\\no=- ..."
  }
}
```

### 4. WebRTC Answer
Send WebRTC answer in response to offer.

**Request:**
```json
{
  "type": "answer",
  "to": "target-client-id",
  "data": {
    "sdp": "v=0\\r\\no=- ..."  // SDP answer string
  }
}
```

**Forwarded to Target:**
```json
{
  "type": "answer",
  "from": "sender-client-id",
  "to": "target-client-id",
  "data": {
    "sdp": "v=0\\r\\no=- ..."
  }
}
```

### 5. ICE Candidate
Exchange ICE candidates for NAT traversal.

**Request:**
```json
{
  "type": "ice-candidate",
  "to": "target-client-id",
  "data": {
    "candidate": "candidate:842163049 1 udp ...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

**Forwarded to Target:**
```json
{
  "type": "ice-candidate",
  "from": "sender-client-id",
  "to": "target-client-id",
  "data": {
    "candidate": "candidate:842163049 1 udp ...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

### 6. Send Reaction
Broadcast reaction value to all room participants.

**Request:**
```json
{
  "type": "reaction",
  "data": {
    "v": 75,                    // Reaction value (0-100)
    "t": 1640995200000         // Unix timestamp in milliseconds
  }
}
```

**Broadcast to Room (excluding sender):**
```json
{
  "type": "reaction",
  "from": "sender-client-id",
  "data": {
    "v": 75,
    "t": 1640995200000
  }
}
```

## Server-to-Client Messages

### 1. Room Users List
Sent when user joins/leaves room.

```json
{
  "type": "room-users",
  "data": {
    "users": [
      {
        "userId": "client-uuid-1",
        "userName": "John Doe"
      },
      {
        "userId": "client-uuid-2",
        "userName": "Jane Smith"
      }
    ]
  }
}
```

### 2. Error Message
Sent when an error occurs.

```json
{
  "type": "error",
  "data": {
    "message": "Room ID is required"
  }
}
```

## WebRTC Data Channel Protocol

After establishing WebRTC peer connections, reaction values are transmitted via Data Channels.

### Data Channel Configuration
- **Label**: "reactions"
- **Ordered**: true
- **MaxRetransmits**: 0 (for low latency)

### Reaction Message Format (via Data Channel)
```json
{
  "v": 50,           // Reaction value (0-100)
  "t": 1640995200000 // Timestamp (Unix milliseconds)
}
```

## Connection Flow Sequence

1. **WebSocket Connection**
   ```
   Client → ws://server:8080/ws
   Server → Connection established, assigns clientId
   ```

2. **Join Room**
   ```
   Client → {"type": "join-room", "data": {"roomId": "room-123", "userName": "John"}}
   Server → {"type": "joined-room", "data": {"roomId": "room-123", "clientId": "uuid"}}
   Server → Broadcasts "user-joined" to room
   Server → Sends "room-users" list to all
   ```

3. **WebRTC Connection Setup (for each peer)**
   ```
   Client A → Creates RTCPeerConnection
   Client A → Creates offer
   Client A → {"type": "offer", "to": "client-B-id", "data": {"sdp": "..."}}
   Client B → Receives offer
   Client B → Creates answer
   Client B → {"type": "answer", "to": "client-A-id", "data": {"sdp": "..."}}
   Both → Exchange ICE candidates
   Both → Connection established
   ```

4. **Reaction Streaming**
   ```
   Client → Sends reaction via WebSocket: {"type": "reaction", "data": {"v": 75, "t": 1234567890}}
   Client → Sends reaction via DataChannel: {"v": 75, "t": 1234567890}
   Server/Peers → Broadcast/Receive reactions
   ```

5. **Disconnect**
   ```
   Client → {"type": "leave-room"} or connection close
   Server → Broadcasts "user-left" to room
   Server → Updates "room-users" list
   ```

## Error Handling

### Connection Errors
- **WebSocket Disconnection**: Automatic cleanup, user removed from room
- **Invalid Message Format**: Server logs error, no response sent
- **Missing Required Fields**: Error message sent to client

### Room Errors
- **Empty Room ID**: `{"type": "error", "data": {"message": "Room ID is required"}}`
- **Invalid Target Client**: Message silently dropped

## Performance Targets

- **WebSocket Latency**: < 50ms
- **Reaction Broadcast**: < 100ms total
- **WebRTC Connection**: < 3 seconds establishment
- **Data Channel Latency**: < 30ms
- **Maximum Users per Room**: 30

## Testing Endpoints

### Local Development
```bash
# Signaling Server
ws://localhost:8080/ws

# Health Check
curl http://localhost:8080/health

# Ion-SFU
http://localhost:7000
```

### Network Development
Replace `localhost` with the server's local network IP address (e.g., `192.168.1.100`).

## Backend Service Commands

### Start Services
```bash
# Start Docker services (Ion-SFU + Redis)
docker-compose up -d

# Start Signaling Server
cd signaling
go run main.go
```

### Check Service Status
```bash
# Docker services
docker-compose ps
docker-compose logs -f

# Signaling server logs
# Will output to console when running

# Redis connection test
redis-cli ping
```

### Stop Services
```bash
# Stop Docker services
docker-compose down

# Stop Signaling Server
Ctrl+C in terminal
```

## iOS Implementation Notes

### Required Frameworks
- **Starscream**: WebSocket client
- **GoogleWebRTC**: WebRTC implementation

### Key Considerations
1. Maintain single WebSocket connection throughout session
2. Handle reconnection logic for network changes
3. Implement exponential backoff for reconnection attempts
4. Use dispatch queues for thread-safe message handling
5. Clean up peer connections when users leave
6. Monitor Data Channel state for reliability
7. Implement heartbeat/ping mechanism for connection health

### Network Permissions
Ensure iOS app has permissions for:
- Local network access (iOS 14+)
- Camera and microphone for WebRTC
- Background modes if needed for persistent connection