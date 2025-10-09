import { v4 as uuidv4 } from 'uuid';
import type {
  IonMessage,
  IonAnswerPayload,
  IonOfferPayload,
  IonTricklePayload,
  IonJoinPayload,
} from '../../types/ion';
import {
  isIonAnswerMessage,
  isIonOfferMessage,
  isIonTrickleMessage,
  isIonErrorMessage,
} from '../../types/ion';
import { config } from '../../config/environment';

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
    console.log('🔧 [ION] IonSessionManager constructed for room:', config.roomId, 'user:', config.userId);
  }

  /**
   * Initialize peer connection and join Ion-SFU room
   */
  async join(localStream: MediaStream): Promise<void> {
    console.groupCollapsed('🎬 [ION] JOIN PROCESS - Room:', this.config.roomId);
    console.log('Role - noPublish:', this.config.noPublish, 'noSubscribe:', this.config.noSubscribe);
    console.log('Local stream tracks:', localStream.getTracks().map(t => t.kind));

    this.localStream = localStream;

    // Create peer connection for publishing
    console.log('📝 Step 1: Creating peer connection...');
    this.publishPC = this.createPeerConnection('publish');
    console.log('✅ Step 1 complete');

    // Add local tracks or transceivers to peer connection
    console.log('📝 Step 2: Adding tracks/transceivers...');
    if (this.config.noPublish) {
      // Viewer: Add recvonly transceivers to receive remote media
      console.log('  - Adding recvonly audio transceiver (viewer mode)');
      this.publishPC.addTransceiver('audio', { direction: 'recvonly' });
      console.log('  - Adding recvonly video transceiver (viewer mode)');
      this.publishPC.addTransceiver('video', { direction: 'recvonly' });
    } else {
      // Broadcaster: Add local tracks for sending
      localStream.getTracks().forEach(track => {
        console.log(`  - Adding ${track.kind} track (broadcaster mode)`);
        this.publishPC!.addTrack(track, localStream);
      });
    }
    console.log('✅ Step 2 complete');

    // Create offer
    console.log('📝 Step 3: Creating offer...');
    const offer = await this.publishPC.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    console.log('✅ Step 3 complete - Offer SDP length:', offer.sdp?.length || 0);

    console.log('📝 Step 4: Setting local description...');
    await this.publishPC.setLocalDescription(offer);
    console.log('✅ Step 4 complete');
    console.log('🔧 ICE gathering state after setLocalDescription:', this.publishPC.iceGatheringState);

    // Wait for ICE gathering to complete
    await this.waitForIceGathering(this.publishPC);

    // Check if SDP contains ice-ufrag
    const sdp = this.publishPC.localDescription!.sdp;
    const hasIceUfrag = sdp.includes('a=ice-ufrag');

    // Log critical info outside of collapsible group for easy debugging
    console.log('🔍 [ION] Final SDP Check - Has ice-ufrag:', hasIceUfrag, 'SDP length:', sdp.length, 'ICE state:', this.publishPC.iceGatheringState);

    console.groupCollapsed('🔍 [ION] Final SDP Check (details)');
    console.log('Type:', this.publishPC.localDescription!.type);
    console.log('SDP length:', sdp.length);
    console.log('Has ice-ufrag:', hasIceUfrag);
    console.log('ICE gathering state:', this.publishPC.iceGatheringState);
    console.log('SDP preview:', sdp.substring(0, 300) + '...');
    console.groupEnd();

    if (!hasIceUfrag) {
      console.error('❌ [ION] SDP does not contain ice-ufrag! Cannot proceed.');
      throw new Error('SDP missing ice-ufrag after ICE gathering');
    }

    // Send join message with offer from localDescription
    // IMPORTANT: Use localDescription to ensure type is string and ice-ufrag is included
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

    console.log('📤 [ION] Sending join with offer.type:', typeof this.publishPC.localDescription!.type, this.publishPC.localDescription!.type);

    // Log what we're actually sending to debug backend issues
    const messageToSend = {
      type: 'ion:join',
      requestId: uuidv4(),
      payload: joinPayload,
    };
    console.log('📤 [ION] Message payload check:', {
      hasOffer: !!messageToSend.payload.offer,
      hasSdp: !!messageToSend.payload.offer?.sdp,
      sdpLength: messageToSend.payload.offer?.sdp?.length || 0,
      sdpType: messageToSend.payload.offer?.type,
      sdpContainsIceUfrag: messageToSend.payload.offer?.sdp?.includes('a=ice-ufrag') || false,
      config: messageToSend.payload.config,
    });

    this.sendMessage(messageToSend);

    console.groupEnd();
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

      // Wait for ICE gathering to complete
      console.log('⏳ [ION] Waiting for ICE gathering to complete (subscribe)...');
      await this.waitForIceGathering(this.subscribePC);
      console.log('✅ [ION] ICE gathering completed (subscribe)');

      console.log('📤 [ION] Sending answer with answer.type:', typeof this.subscribePC.localDescription!.type, this.subscribePC.localDescription!.type);

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
   * Wait for ICE gathering to complete
   */
  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    console.groupCollapsed('⏰ [ION] Waiting for ICE gathering');
    console.log('Current state:', pc.iceGatheringState);

    return new Promise((resolve) => {
      // Already complete
      if (pc.iceGatheringState === 'complete') {
        console.log('✅ Already complete');
        console.groupEnd();
        resolve();
        return;
      }

      let timeoutId: NodeJS.Timeout;

      const checkState = () => {
        console.log('State changed to:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          console.log('✅ ICE gathering complete!');
          console.groupEnd();
          pc.removeEventListener('icegatheringstatechange', checkState);
          clearTimeout(timeoutId);
          resolve();
        }
      };

      pc.addEventListener('icegatheringstatechange', checkState);
      console.log('Event listener added, waiting max 10 seconds...');

      // Timeout after 10 seconds
      timeoutId = setTimeout(() => {
        console.warn('⚠️ TIMEOUT after 10 seconds! Final state:', pc.iceGatheringState);
        console.groupEnd();
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 10000);
    });
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
    console.groupCollapsed(`🔧 [ION] Creating ${type} peer connection`);
    console.log('STUN servers:', config.stunServers);

    const pc = new RTCPeerConnection({
      iceServers: config.stunServers.map(url => ({ urls: url })),
    });

    console.log('✅ RTCPeerConnection created');
    console.log('Initial ICE gathering state:', pc.iceGatheringState);
    console.log('Initial ICE connection state:', pc.iceConnectionState);
    console.groupEnd();

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 [ION] ICE candidate (${type}):`, event.candidate.candidate.substring(0, 50) + '...');
        this.sendMessage({
          type: 'ion:trickle',
          payload: {
            target: type === 'publish' ? 0 : 1,
            candidate: event.candidate.toJSON(),
          },
        });
      } else {
        console.log(`✅ [ION] ICE gathering finished for ${type}`);
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

  /**
   * Get connection state
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.publishPC?.connectionState || null;
  }
}
