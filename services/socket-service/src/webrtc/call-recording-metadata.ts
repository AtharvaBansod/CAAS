import { EventEmitter } from 'events';
import { MongoClient, Collection } from 'mongodb';
import { Kafka, Producer } from 'kafkajs';

interface CallRecordingMetadata {
  recording_id: string;
  call_id: string;
  conversation_id: string;
  tenant_id: string;
  participants: Array<{
    user_id: string;
    joined_at: Date;
    left_at?: Date;
    consent_given: boolean;
    consent_timestamp?: Date;
  }>;
  start_time: Date;
  end_time?: Date;
  duration_seconds?: number;
  quality_metrics?: {
    avg_bitrate?: number;
    packet_loss?: number;
    jitter?: number;
    resolution?: string;
  };
  consent_status: 'pending' | 'all_consented' | 'partial' | 'denied';
  recording_url?: string;
  storage_location?: string;
  file_size_bytes?: number;
  format?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

interface ConsentRequest {
  recording_id: string;
  user_id: string;
  requested_at: Date;
  expires_at: Date;
}

export class CallRecordingMetadataManager extends EventEmitter {
  private mongoClient: MongoClient;
  private kafka: Kafka;
  private producer: Producer;
  private collection?: Collection<CallRecordingMetadata>;
  private consentRequests: Map<string, ConsentRequest> = new Map();
  private consentTimeout: number = 30000; // 30 seconds default

  constructor(mongoClient: MongoClient, kafka: Kafka, consentTimeoutMs?: number) {
    super();
    this.mongoClient = mongoClient;
    this.kafka = kafka;
    this.producer = kafka.producer();
    if (consentTimeoutMs) {
      this.consentTimeout = consentTimeoutMs;
    }
  }

  async initialize(): Promise<void> {
    await this.producer.connect();
    this.collection = this.mongoClient
      .db('caas_platform')
      .collection<CallRecordingMetadata>('call_recordings');
    
    // Create indexes
    await this.collection.createIndex({ call_id: 1, tenant_id: 1 });
    await this.collection.createIndex({ conversation_id: 1, tenant_id: 1 });
    await this.collection.createIndex({ recording_id: 1 }, { unique: true });
    
    console.log('[CallRecordingMetadataManager] Initialized');
  }

  async shutdown(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Start recording and create metadata
   */
  async startRecording(
    callId: string,
    conversationId: string,
    tenantId: string,
    participants: Array<{ user_id: string; joined_at: Date }>
  ): Promise<CallRecordingMetadata> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metadata: CallRecordingMetadata = {
      recording_id: recordingId,
      call_id: callId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      participants: participants.map((p) => ({
        user_id: p.user_id,
        joined_at: p.joined_at,
        consent_given: false,
      })),
      start_time: new Date(),
      consent_status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.collection.insertOne(metadata as any);

    // Request consent from all participants
    for (const participant of participants) {
      await this.requestConsent(recordingId, participant.user_id);
    }

    // Publish event to Kafka
    await this.publishEvent('recording.started', metadata);

    this.emit('recording:started', metadata);

    return metadata;
  }

  /**
   * Stop recording and finalize metadata
   */
  async stopRecording(
    recordingId: string,
    qualityMetrics?: CallRecordingMetadata['quality_metrics']
  ): Promise<void> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    const endTime = new Date();
    const recording = await this.collection.findOne({ recording_id: recordingId } as any);

    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }

    const durationSeconds = Math.floor(
      (endTime.getTime() - recording.start_time.getTime()) / 1000
    );

    await this.collection.updateOne(
      { recording_id: recordingId } as any,
      {
        $set: {
          end_time: endTime,
          duration_seconds: durationSeconds,
          quality_metrics: qualityMetrics,
          updated_at: new Date(),
        },
      }
    );

    const updatedRecording = await this.collection.findOne({ recording_id: recordingId } as any);

    // Publish event to Kafka
    await this.publishEvent('recording.stopped', updatedRecording!);

    this.emit('recording:stopped', updatedRecording);
  }

  /**
   * Request consent from a participant
   */
  async requestConsent(recordingId: string, userId: string): Promise<void> {
    const key = `${recordingId}:${userId}`;
    const expiresAt = new Date(Date.now() + this.consentTimeout);

    const request: ConsentRequest = {
      recording_id: recordingId,
      user_id: userId,
      requested_at: new Date(),
      expires_at: expiresAt,
    };

    this.consentRequests.set(key, request);

    // Set timeout to auto-deny if no response
    setTimeout(() => {
      this.handleConsentTimeout(recordingId, userId);
    }, this.consentTimeout);

    this.emit('consent:requested', { recording_id: recordingId, user_id: userId });
  }

  /**
   * Record consent from a participant
   */
  async recordConsent(
    recordingId: string,
    userId: string,
    consented: boolean
  ): Promise<void> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    const key = `${recordingId}:${userId}`;
    this.consentRequests.delete(key);

    await this.collection.updateOne(
      {
        recording_id: recordingId,
        'participants.user_id': userId,
      } as any,
      {
        $set: {
          'participants.$.consent_given': consented,
          'participants.$.consent_timestamp': new Date(),
          updated_at: new Date(),
        },
      }
    );

    // Update overall consent status
    await this.updateConsentStatus(recordingId);

    this.emit('consent:recorded', {
      recording_id: recordingId,
      user_id: userId,
      consented,
    });

    // Publish event to Kafka
    await this.publishEvent('recording.consent', {
      recording_id: recordingId,
      user_id: userId,
      consented,
      timestamp: new Date(),
    });
  }

  /**
   * Handle consent timeout
   */
  private async handleConsentTimeout(recordingId: string, userId: string): Promise<void> {
    const key = `${recordingId}:${userId}`;
    const request = this.consentRequests.get(key);

    if (request) {
      // Auto-deny if no response
      await this.recordConsent(recordingId, userId, false);
      this.emit('consent:timeout', { recording_id: recordingId, user_id: userId });
    }
  }

  /**
   * Update overall consent status
   */
  private async updateConsentStatus(recordingId: string): Promise<void> {
    if (!this.collection) {
      return;
    }

    const recording = await this.collection.findOne({ recording_id: recordingId } as any);

    if (!recording) {
      return;
    }

    const totalParticipants = recording.participants.length;
    const consentedCount = recording.participants.filter((p: { consent_given?: boolean }) => p.consent_given).length;

    let consentStatus: CallRecordingMetadata['consent_status'];

    if (consentedCount === 0) {
      consentStatus = 'denied';
    } else if (consentedCount === totalParticipants) {
      consentStatus = 'all_consented';
    } else {
      consentStatus = 'partial';
    }

    await this.collection.updateOne(
      { recording_id: recordingId } as any,
      {
        $set: {
          consent_status: consentStatus,
          updated_at: new Date(),
        },
      }
    );

    // If all consented, emit event
    if (consentStatus === 'all_consented') {
      this.emit('consent:all_granted', { recording_id: recordingId });
    } else if (consentStatus === 'denied') {
      this.emit('consent:denied', { recording_id: recordingId });
    }
  }

  /**
   * Check if recording can proceed (compliance check)
   */
  async canProceedWithRecording(recordingId: string): Promise<boolean> {
    if (!this.collection) {
      return false;
    }

    const recording = await this.collection.findOne({ recording_id: recordingId } as any);

    if (!recording) {
      return false;
    }

    // Recording can proceed only if all participants consented
    return recording.consent_status === 'all_consented';
  }

  /**
   * Update recording storage information
   */
  async updateStorageInfo(
    recordingId: string,
    storageLocation: string,
    recordingUrl: string,
    fileSizeBytes: number,
    format: string
  ): Promise<void> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    await this.collection.updateOne(
      { recording_id: recordingId } as any,
      {
        $set: {
          storage_location: storageLocation,
          recording_url: recordingUrl,
          file_size_bytes: fileSizeBytes,
          format,
          updated_at: new Date(),
        },
      }
    );
  }

  /**
   * Get recording metadata
   */
  async getRecording(recordingId: string): Promise<CallRecordingMetadata | null> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    return this.collection.findOne({ recording_id: recordingId } as any);
  }

  /**
   * Get recordings for a call
   */
  async getRecordingsForCall(callId: string, tenantId: string): Promise<CallRecordingMetadata[]> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    return this.collection.find({ call_id: callId, tenant_id: tenantId } as any).toArray();
  }

  /**
   * Get recordings for a conversation
   */
  async getRecordingsForConversation(
    conversationId: string,
    tenantId: string
  ): Promise<CallRecordingMetadata[]> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    return this.collection
      .find({ conversation_id: conversationId, tenant_id: tenantId } as any)
      .toArray();
  }

  /**
   * Publish event to Kafka
   */
  private async publishEvent(eventType: string, data: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'webrtc.recording.events',
        messages: [
          {
            key: data.recording_id || data.call_id,
            value: JSON.stringify({
              event_type: eventType,
              data,
              timestamp: new Date(),
            }),
          },
        ],
      });
    } catch (error) {
      console.error('[CallRecordingMetadataManager] Failed to publish event:', error);
    }
  }

  /**
   * Delete recording metadata (for compliance/GDPR)
   */
  async deleteRecording(recordingId: string): Promise<void> {
    if (!this.collection) {
      throw new Error('CallRecordingMetadataManager not initialized');
    }

    await this.collection.deleteOne({ recording_id: recordingId } as any);
    
    // Publish deletion event
    await this.publishEvent('recording.deleted', { recording_id: recordingId });
  }
}
