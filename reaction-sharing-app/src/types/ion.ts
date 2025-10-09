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
    typeof msg.type === 'string' &&
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

// Explicit type re-exports for compatibility
export type {
  IonMessage,
  IonMessageType,
  IonPayload,
  IonJoinPayload,
  IonJoinConfig,
  IonAnswerPayload,
  IonOfferPayload,
  IonTricklePayload,
  IonErrorPayload,
  IonErrorCode,
};
