# Frontend Ion-SFU WebSocket Integration Guide

## Overview

This guide provides step-by-step instructions for implementing Ion-SFU WebSocket integration in the React/TypeScript frontend. The implementation replaces the existing REST API-based approach with a WebSocket-based bidirectional communication pattern.

## Architecture Summary

```
React Component
    ↓
IonSessionManager (new)
    ↓
WebSocketContext (existing, extended)
    ↓
WebSocket Connection
    ↓
Go Signaling Server ←→ Ion-SFU
```

## Implementation Phases

### Phase 1: TypeScript Type Definitions
### Phase 2: WebSocket Message Handling
### Phase 3: IonSessionManager Implementation
### Phase 4: React Component Integration
### Phase 5: Testing & Validation

---

## Phase 1: TypeScript Type Definitions

### 1.1 Create Ion Message Types

Create `src/types/ion.ts`:

```typescript
// Ion-SFU WebSocket Message Types
// Based on backend implementation in pkg/types/ion.go

/**
 * Ion WebSocket message envelope
 * All Ion messages use this wrapper for type-safe routing
 */
export interface IonMessage {
  type: IonMessageType;
  requestId?: string; // Optional UUID for request-response correlation
  payload: IonPayload;
}

/**
 * Ion message types
 */
export type IonMessageType =
  | 'ion:join'
  | 'ion:answer'
  | 'ion:offer'
  | 'ion:trickle'
  | 'ion:error';

/**
 * Union type for all Ion payloads
 */
export type IonPayload =
  | IonJoinPayload
  | IonAnswerPayload
  | IonOfferPayload
  | IonTricklePayload
  | IonErrorPayload;

/**
 * Payload for ion:join message (client → server)
 */
export interface IonJoinPayload {
  sid: string; // Session ID (room ID)
  uid: string; // User ID
  offer: RTCSessionDescriptionInit; // WebRTC Offer SDP
  config?: IonJoinConfig;
}

/**
 * Configuration for join request
 */
export interface IonJoinConfig {
  noPublish?: boolean; // True if client will not publish
  noSubscribe?: boolean; // True if client will not subscribe
}

/**
 * Payload for ion:answer message (both directions)
 */
export interface IonAnswerPayload {
  desc: RTCSessionDescriptionInit; // WebRTC Answer SDP
}

/**
 * Payload for ion:offer message (server → client or client → server)
 */
export interface IonOfferPayload {
  desc: RTCSessionDescriptionInit; // WebRTC Offer SDP
}

/**
 * Payload for ion:trickle message
 */
export interface IonTricklePayload {
  target: 0 | 1; // 0 = send, 1 = receive
  candidate: RTCIceCandidateInit; // ICE Candidate
}

/**
 * Payload for ion:error message
 */
export interface IonErrorPayload {
  code: IonErrorCode;
  details: string;
}

/**
 * Ion error codes
 */
export type IonErrorCode =
  | 'ION_TIMEOUT'
  | 'ION_RPC_ERROR'
  | 'DESERIALIZATION'
  | 'ION_UNAVAILABLE';

/**
 * Type guards for Ion messages
 */
export function isIonMessage(msg: any): msg is IonMessage {
  return (
    msg &&
    typeof msg === 'object' &&
    'type' in msg &&
    'payload' in msg &&
    msg.type.startsWith('ion:')
  );
}

export function isIonJoinMessage(msg: IonMessage): msg is IonMessage & { payload: IonJoinPayload } {
  return msg.type === 'ion:join';
}

export function isIonAnswerMessage(msg: IonMessage): msg is IonMessage & { payload: IonAnswerPayload } {
  return msg.type === 'ion:answer';
}

export function isIonOfferMessage(msg: IonMessage): msg is IonMessage & { payload: IonOfferPayload } {
  return msg.type === 'ion:offer';
}

export function isIonTrickleMessage(msg: IonMessage): msg is IonMessage & { payload: IonTricklePayload } {
  return msg.type === 'ion:trickle';
}

export function isIonErrorMessage(msg: IonMessage): msg is IonMessage & { payload: IonErrorPayload } {
  return msg.type === 'ion:error';
}
```

### 1.2 Update Existing WebSocket Message Types

Update `src/types/websocket.ts` to include Ion messages:

```typescript
import { IonMessage } from './ion';

// Existing message types
export interface EmotionMessage {
  type: 'emotion.update' | 'emotion.broadcast';
  // ... existing fields
}

export interface RoomMessage {
  type: 'room:join' | 'room:leave';
  // ... existing fields
}

// Union type for all WebSocket messages
export type WebSocketMessage =
  | EmotionMessage
  | RoomMessage
  | IonMessage; // Add Ion messages

// Type guard for message routing
export function getMessageType(msg: any): string {
  if (msg && typeof msg === 'object' && 'type' in msg) {
    return msg.type;
  }
  return 'unknown';
}
```

---

## Phase 2: WebSocket Message Handling

### 2.1 Extend WebSocket Context

Update `src/contexts/WebSocketContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { IonMessage, isIonMessage } from '../types/ion';

interface WebSocketContextType {
  // Existing methods
  send: (message: any) => void;

  // New Ion-specific methods
  sendIonMessage: (message: IonMessage) => void;
  subscribeToIonMessages: (handler: IonMessageHandler) => () => void;

  // Connection state
  isConnected: boolean;
}

type IonMessageHandler = (message: IonMessage) => void;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ionHandlersRef = useRef<Set<IonMessageHandler>>(new Set());

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws');

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Route Ion messages to Ion handlers
        if (isIonMessage(message)) {
          console.log('📨 [ION] Received:', message.type);
          ionHandlersRef.current.forEach(handler => handler(message));
          return;
        }

        // Handle other message types (emotion, room, etc.)
        // ... existing logic
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const send = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const sendIonMessage = (message: IonMessage) => {
    console.log('📤 [ION] Sending:', message.type);
    send(message);
  };

  const subscribeToIonMessages = (handler: IonMessageHandler) => {
    ionHandlersRef.current.add(handler);

    // Return unsubscribe function
    return () => {
      ionHandlersRef.current.delete(handler);
    };
  };

  return (
    <WebSocketContext.Provider value={{
      send,
      sendIonMessage,
      subscribeToIonMessages,
      isConnected
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

---

## Phase 3: IonSessionManager Implementation

### 3.1 Create IonSessionManager

Create `src/services/IonSessionManager.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import {
  IonMessage,
  IonAnswerPayload,
  IonOfferPayload,
  IonTricklePayload,
  IonJoinPayload,
  isIonAnswerMessage,
  isIonOfferMessage,
  isIonTrickleMessage,
  isIonErrorMessage,
} from '../types/ion';

/**
 * Configuration for IonSessionManager
 */
export interface IonSessionConfig {
  roomId: string;
  userId: string;
  noPublish?: boolean;
  noSubscribe?: boolean;
}

/**
 * Manages WebRTC peer connection and Ion-SFU signaling via WebSocket
 */
export class IonSessionManager {
  private config: IonSessionConfig;
  private sendMessage: (msg: IonMessage) => void;

  // WebRTC peer connections
  private publishPC: RTCPeerConnection | null = null;
  private subscribePC: RTCPeerConnection | null = null;

  // Media streams
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();

  // Event handlers
  private onRemoteTrack?: (stream: MediaStream, track: RTCTrackEvent) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private onError?: (error: Error) => void;

  // ICE candidate queue (for candidates received before remote description)
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  constructor(
    config: IonSessionConfig,
    sendMessage: (msg: IonMessage) => void
  ) {
    this.config = config;
    this.sendMessage = sendMessage;
  }

  /**
   * Initialize peer connection and join Ion-SFU room
   */
  async join(localStream: MediaStream): Promise<void> {
    console.log('🎬 [ION] Joining room:', this.config.roomId);

    this.localStream = localStream;

    // Create peer connection for publishing
    this.publishPC = this.createPeerConnection('publish');

    // Add local tracks to peer connection
    localStream.getTracks().forEach(track => {
      this.publishPC!.addTrack(track, localStream);
    });

    // Create offer
    const offer = await this.publishPC.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.publishPC.setLocalDescription(offer);

    // Send join message with offer from localDescription
    // IMPORTANT: Use localDescription to ensure type is string, not number
    const joinPayload: IonJoinPayload = {
      sid: this.config.roomId,
      uid: this.config.userId,
      offer: {
        sdp: this.publishPC.localDescription!.sdp,
        type: this.publishPC.localDescription!.type,  // Guaranteed string "offer"
      },
      config: {
        noPublish: this.config.noPublish,
        noSubscribe: this.config.noSubscribe,
      },
    };

    this.sendMessage({
      type: 'ion:join',
      requestId: uuidv4(),
      payload: joinPayload,
    });
  }

  /**
   * Handle incoming Ion messages
   */
  handleMessage(message: IonMessage): void {
    console.log('📨 [ION] Handling message:', message.type);

    if (isIonAnswerMessage(message)) {
      this.handleAnswer(message.payload);
    } else if (isIonOfferMessage(message)) {
      this.handleOffer(message.payload);
    } else if (isIonTrickleMessage(message)) {
      this.handleTrickle(message.payload);
    } else if (isIonErrorMessage(message)) {
      this.handleError(message.payload);
    }
  }

  /**
   * Handle answer from Ion-SFU
   */
  private async handleAnswer(payload: IonAnswerPayload): Promise<void> {
    console.log('📥 [ION] Received answer');

    if (!this.publishPC) {
      console.error('❌ No publish peer connection');
      return;
    }

    try {
      await this.publishPC.setRemoteDescription(
        new RTCSessionDescription(payload.desc)
      );

      // Process pending ICE candidates
      await this.processPendingIceCandidates();

      console.log('✅ [ION] Remote description set');
    } catch (error) {
      console.error('❌ [ION] Failed to set remote description:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Handle offer from Ion-SFU (for receiving remote streams)
   */
  private async handleOffer(payload: IonOfferPayload): Promise<void> {
    console.log('📥 [ION] Received offer for remote stream');

    // Create subscribe peer connection if not exists
    if (!this.subscribePC) {
      this.subscribePC = this.createPeerConnection('subscribe');
    }

    try {
      // Set remote description
      await this.subscribePC.setRemoteDescription(
        new RTCSessionDescription(payload.desc)
      );

      // Create answer
      const answer = await this.subscribePC.createAnswer();
      await this.subscribePC.setLocalDescription(answer);

      // Send answer back to server
      // IMPORTANT: Use localDescription to ensure type is string
      this.sendMessage({
        type: 'ion:answer',
        payload: {
          desc: {
            sdp: this.subscribePC.localDescription!.sdp,
            type: this.subscribePC.localDescription!.type,  // Guaranteed string "answer"
          },
        },
      });

      console.log('✅ [ION] Answer sent for remote stream');
    } catch (error) {
      console.error('❌ [ION] Failed to handle offer:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Handle ICE candidate from Ion-SFU
   */
  private async handleTrickle(payload: IonTricklePayload): Promise<void> {
    const pc = payload.target === 0 ? this.publishPC : this.subscribePC;

    if (!pc) {
      console.warn('⚠️  [ION] No peer connection for trickle target:', payload.target);
      return;
    }

    try {
      // If remote description is not set yet, queue the candidate
      if (!pc.remoteDescription) {
        this.pendingIceCandidates.push(payload.candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      console.log('🧊 [ION] ICE candidate added');
    } catch (error) {
      console.error('❌ [ION] Failed to add ICE candidate:', error);
    }
  }

  /**
   * Process queued ICE candidates after remote description is set
   */
  private async processPendingIceCandidates(): Promise<void> {
    if (this.pendingIceCandidates.length === 0) return;

    console.log(`🧊 [ION] Processing ${this.pendingIceCandidates.length} pending ICE candidates`);

    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.publishPC!.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('❌ [ION] Failed to add pending ICE candidate:', error);
      }
    }

    this.pendingIceCandidates = [];
  }

  /**
   * Handle error from Ion-SFU
   */
  private handleError(payload: { code: string; details: string }): void {
    console.error('❌ [ION] Error:', payload.code, payload.details);
    this.onError?.(new Error(`${payload.code}: ${payload.details}`));
  }

  /**
   * Create WebRTC peer connection
   */
  private createPeerConnection(type: 'publish' | 'subscribe'): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 [ION] Local ICE candidate:', type);

        this.sendMessage({
          type: 'ion:trickle',
          payload: {
            target: type === 'publish' ? 0 : 1,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔌 [ION] Connection state (${type}):`, pc.connectionState);
      this.onConnectionStateChange?.(pc.connectionState);
    };

    // Handle remote tracks (for subscribe PC)
    if (type === 'subscribe') {
      pc.ontrack = (event) => {
        console.log('📺 [ION] Received remote track:', event.track.kind);

        const stream = event.streams[0];
        if (stream) {
          this.remoteStreams.set(stream.id, stream);
          this.onRemoteTrack?.(stream, event);
        }
      };
    }

    return pc;
  }

  /**
   * Leave the Ion-SFU room
   */
  leave(): void {
    console.log('🚪 [ION] Leaving room');

    // Close peer connections
    this.publishPC?.close();
    this.subscribePC?.close();

    this.publishPC = null;
    this.subscribePC = null;

    // Stop local tracks
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;

    // Clear remote streams
    this.remoteStreams.clear();
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: {
    onRemoteTrack?: (stream: MediaStream, event: RTCTrackEvent) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onError?: (error: Error) => void;
  }): void {
    this.onRemoteTrack = handlers.onRemoteTrack;
    this.onConnectionStateChange = handlers.onConnectionStateChange;
    this.onError = handlers.onError;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get all remote streams
   */
  getRemoteStreams(): MediaStream[] {
    return Array.from(this.remoteStreams.values());
  }
}
```

---

## Phase 4: React Component Integration

### 4.1 Create useIonSession Hook

Create `src/hooks/useIonSession.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { IonSessionManager } from '../services/IonSessionManager';

export interface UseIonSessionOptions {
  roomId: string;
  userId: string;
  autoJoin?: boolean;
  noPublish?: boolean;
  noSubscribe?: boolean;
}

export function useIonSession(options: UseIonSessionOptions) {
  const { sendIonMessage, subscribeToIonMessages } = useWebSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<Error | null>(null);
  const sessionRef = useRef<IonSessionManager | null>(null);

  // Initialize session manager
  useEffect(() => {
    const session = new IonSessionManager(
      {
        roomId: options.roomId,
        userId: options.userId,
        noPublish: options.noPublish,
        noSubscribe: options.noSubscribe,
      },
      sendIonMessage
    );

    session.setEventHandlers({
      onRemoteTrack: (stream) => {
        console.log('📺 New remote stream received');
        setRemoteStreams(session.getRemoteStreams());
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
      onError: (err) => {
        setError(err);
      },
    });

    sessionRef.current = session;

    // Subscribe to Ion messages
    const unsubscribe = subscribeToIonMessages((message) => {
      session.handleMessage(message);
    });

    return () => {
      unsubscribe();
      session.leave();
    };
  }, [options.roomId, options.userId, sendIonMessage, subscribeToIonMessages]);

  // Get local media and join
  const join = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, frameRate: 60 },
        audio: true,
      });

      setLocalStream(stream);

      if (sessionRef.current) {
        await sessionRef.current.join(stream);
      }
    } catch (err) {
      setError(err as Error);
      console.error('❌ Failed to get user media:', err);
    }
  };

  // Leave room
  const leave = () => {
    if (sessionRef.current) {
      sessionRef.current.leave();
      setLocalStream(null);
      setRemoteStreams([]);
    }
  };

  // Auto-join if enabled
  useEffect(() => {
    if (options.autoJoin) {
      join();
    }
  }, [options.autoJoin]);

  return {
    localStream,
    remoteStreams,
    connectionState,
    error,
    join,
    leave,
  };
}
```

### 4.2 Example Component Usage

Create `src/components/BroadcastRoom.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';
import { useIonSession } from '../hooks/useIonSession';

interface BroadcastRoomProps {
  roomId: string;
  userId: string;
}

export const BroadcastRoom: React.FC<BroadcastRoomProps> = ({ roomId, userId }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const {
    localStream,
    remoteStreams,
    connectionState,
    error,
    join,
    leave,
  } = useIonSession({
    roomId,
    userId,
    autoJoin: false,
  });

  // Display local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Display remote streams
  useEffect(() => {
    remoteStreams.forEach((stream) => {
      const videoElement = remoteVideosRef.current.get(stream.id);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  return (
    <div className="broadcast-room">
      <h2>Room: {roomId}</h2>

      <div className="connection-status">
        Status: {connectionState}
        {error && <div className="error">Error: {error.message}</div>}
      </div>

      <div className="controls">
        <button onClick={join}>Join</button>
        <button onClick={leave}>Leave</button>
      </div>

      <div className="video-grid">
        {/* Local video */}
        <div className="video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
          <span className="video-label">You ({userId})</span>
        </div>

        {/* Remote videos */}
        {remoteStreams.map((stream) => (
          <div key={stream.id} className="video-container">
            <video
              ref={(el) => {
                if (el) {
                  remoteVideosRef.current.set(stream.id, el);
                  el.srcObject = stream;
                }
              }}
              autoPlay
              playsInline
              className="remote-video"
            />
            <span className="video-label">Remote ({stream.id})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Phase 5: Testing & Validation

### 5.1 Testing Checklist

**Basic Connectivity:**
- [ ] WebSocket connects successfully
- [ ] Ion messages are sent and received
- [ ] Local media stream is captured
- [ ] Peer connection is established

**Publisher Flow:**
- [ ] Send ion:join with offer
- [ ] Receive ion:answer from server
- [ ] ICE candidates are exchanged
- [ ] Connection state becomes "connected"

**Viewer Flow:**
- [ ] Receive ion:offer from server
- [ ] Send ion:answer to server
- [ ] Remote tracks are received
- [ ] Remote video is displayed

**Error Handling:**
- [ ] Handle getUserMedia errors
- [ ] Handle WebSocket disconnection
- [ ] Handle ICE connection failures
- [ ] Display error messages to user

### 5.2 Debug Logging

Add console logging to track message flow:

```typescript
// In WebSocketContext
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('📨 WS Message:', message.type, message);
  // ... handle message
};

// In IonSessionManager
console.log('📤 Sending Ion message:', message.type);
console.log('📥 Received Ion message:', message.type);
console.log('🔌 Connection state:', pc.connectionState);
console.log('🧊 ICE state:', pc.iceConnectionState);
```

### 5.3 Testing Scenarios

**Test 1: Single Publisher**
1. Open browser, join room as publisher
2. Verify local video displays
3. Check console for successful ion:join → ion:answer flow
4. Verify connection state becomes "connected"

**Test 2: Publisher + Viewer**
1. Publisher joins first
2. Viewer joins second
3. Verify viewer receives ion:offer
4. Verify viewer sends ion:answer
5. Verify viewer sees publisher's video

**Test 3: Multiple Participants**
1. 3+ users join same room
2. Verify each user sees all other users
3. Check ICE candidate exchange logs
4. Monitor connection states

---

## Migration from REST API

### Before (REST API):

```typescript
// OLD: Using REST API
const response = await fetch('/api/broadcast/demo-room/join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ offer }),
});
const { answer } = await response.json();
```

### After (WebSocket):

```typescript
// NEW: Using WebSocket
sendIonMessage({
  type: 'ion:join',
  payload: {
    sid: roomId,
    uid: userId,
    offer: offer,
  },
});

// Answer received via WebSocket message handler
```

---

## Common Issues & Solutions

### Issue 0: Invalid SDP Type Error

**Error:** `'0' is not a valid enum value of type SDPType` or `TypeError: provided value is not a valid enum value of type SDPType`

**Root Cause:** WebRTC's `RTCSessionDescription.type` field must be a string (`"offer"`, `"answer"`, `"pranswer"`, or `"rollback"`), but sometimes it gets serialized as a number.

**Solution:** Always use `localDescription` or `remoteDescription` properties after setting them, which guarantee the correct string type:

```typescript
// ❌ WRONG - May serialize type as number
const offer = await pc.createOffer();
sendIonMessage({
  type: 'ion:join',
  payload: {
    sid: roomId,
    uid: userId,
    offer: offer  // offer.type might become 0 when serialized
  }
});

// ✅ CORRECT - Use localDescription after setting it
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

sendIonMessage({
  type: 'ion:join',
  payload: {
    sid: roomId,
    uid: userId,
    offer: {
      sdp: pc.localDescription!.sdp,
      type: pc.localDescription!.type  // Guaranteed to be string "offer"
    }
  }
});
```

**Backend Defense:** The backend now includes automatic SDP normalization (`normalizeSDP()` function) that converts numeric types to strings, but it's best practice to send the correct format from the frontend.

**Type Mapping (for reference):**
- `0` → `"offer"`
- `1` → `"pranswer"`
- `2` → `"answer"`
- `3` → `"rollback"`

### Issue 1: Remote Description Not Set

**Error:** `Failed to execute 'addIceCandidate': The remote description was not set.`

**Solution:** Queue ICE candidates until remote description is set (already implemented in IonSessionManager).

### Issue 2: No Remote Tracks

**Symptoms:** Connection succeeds but no video/audio

**Checks:**
- Verify publisher added tracks to peer connection
- Check `ontrack` event is firing
- Verify offer includes correct media types
- Check browser console for track events

### Issue 3: WebSocket Disconnection

**Symptoms:** Messages stop flowing

**Solution:**
- Implement WebSocket reconnection logic
- Store connection state in context
- Retry failed join attempts

### Issue 4: ICE Connection Failed

**Symptoms:** Connection state stuck at "connecting"

**Checks:**
- Verify STUN/TURN servers are reachable
- Check network firewall settings
- Enable verbose ICE logging
- Try different ICE server configurations

---

## Performance Optimization

### 1. Lazy Load MediaStream

```typescript
// Only get media when actually joining
const join = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 360 },
    audio: true,
  });
  // Use stream...
};
```

### 2. Debounce ICE Candidates

```typescript
// Batch ICE candidates to reduce messages
private iceCandidateQueue: RTCIceCandidateInit[] = [];
private sendQueuedCandidates = debounce(() => {
  // Send all queued candidates at once
}, 100);
```

### 3. Video Element Pooling

```typescript
// Reuse video elements instead of creating new ones
const videoPool = new Map<string, HTMLVideoElement>();
```

---

## Security Considerations

1. **Authentication**: Ensure WebSocket connection includes auth token
2. **Room Access**: Validate user has permission to join room
3. **Media Permissions**: Handle getUserMedia denials gracefully
4. **HTTPS/WSS**: Use secure connections in production

---

## Next Steps

After completing this implementation:

1. **Test thoroughly** with multiple browsers and devices
2. **Add analytics** to track connection success rates
3. **Implement reconnection logic** for robustness
4. **Add UI feedback** for connection states
5. **Optimize video quality** based on network conditions
6. **Add screen sharing** support
7. **Implement recording** functionality

---

## Reference Links

- **Backend Design Doc**: `/documents/ion_sfu_websocket_integration_design.md`
- **Backend Types**: `/pkg/types/ion.go`
- **WebSocket Handler**: `/internal/handlers/websocket.go`
- **Ion-SFU Handler**: `/internal/handlers/ion_sfu.go`

---

## API Reference

### WebSocket Context

```typescript
interface WebSocketContextType {
  sendIonMessage: (message: IonMessage) => void;
  subscribeToIonMessages: (handler: (msg: IonMessage) => void) => () => void;
  isConnected: boolean;
}
```

### IonSessionManager

```typescript
class IonSessionManager {
  constructor(config: IonSessionConfig, sendMessage: (msg: IonMessage) => void);

  async join(localStream: MediaStream): Promise<void>;
  handleMessage(message: IonMessage): void;
  leave(): void;

  setEventHandlers(handlers: {
    onRemoteTrack?: (stream: MediaStream, event: RTCTrackEvent) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onError?: (error: Error) => void;
  }): void;

  getLocalStream(): MediaStream | null;
  getRemoteStreams(): MediaStream[];
}
```

### useIonSession Hook

```typescript
function useIonSession(options: UseIonSessionOptions): {
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  connectionState: RTCPeerConnectionState;
  error: Error | null;
  join: () => Promise<void>;
  leave: () => void;
}
```

---

## Appendix: Message Flow Diagram

```
┌─────────────┐                    ┌──────────────┐                    ┌──────────┐
│   Client    │                    │    Server    │                    │ Ion-SFU  │
└──────┬──────┘                    └──────┬───────┘                    └────┬─────┘
       │                                  │                                  │
       │ 1. ion:join {offer}              │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │ 2. join {offer}                  │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │ 3. {answer}                      │
       │                                  │<─────────────────────────────────│
       │ 4. ion:answer {desc}             │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │ 5. ion:trickle {candidate}       │                                  │
       │<────────────────────────────────>│<────────────────────────────────>│
       │                                  │                                  │
       │ 6. ion:offer {desc} (for remote) │                                  │
       │<─────────────────────────────────│<─────────────────────────────────│
       │                                  │                                  │
       │ 7. ion:answer {desc}             │                                  │
       │─────────────────────────────────>│─────────────────────────────────>│
       │                                  │                                  │
```

---

**Document Version:** 1.1
**Last Updated:** 2025-10-09
**Related Backend Version:** Phase 1 Complete (with SDP normalization)
**Changelog:**
- v1.1: Added Issue 0 (Invalid SDP Type Error) with solution and backend defense
- v1.0: Initial release
