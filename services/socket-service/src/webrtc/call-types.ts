export type CallStatus = 'initiating' | 'ringing' | 'answered' | 'connected' | 'ended' | 'rejected' | 'missed';
export type MediaType = 'audio' | 'video';
export type CallType = 'one_to_one' | 'group';
export type EndReason = 'user_hangup' | 'timeout' | 'error' | 'network_failure' | 'rejected' | 'cancelled' | 'busy';

export interface Call {
    id: string;
    type: CallType;
    status: CallStatus;
    caller_id: string;
    participants: CallParticipant[];
    media_type: MediaType;
    tenant_id: string;
    created_at: Date;
    started_at?: Date;
    ended_at?: Date;
    end_reason?: EndReason;
    ended_by?: string;
}

export interface CallParticipant {
    user_id: string;
    joined_at?: Date;
    left_at?: Date;
    status: 'calling' | 'ringing' | 'connected' | 'disconnected';
}

export interface CallRecord {
    call_id: string;
    type: CallType;
    participants: {
        user_id: string;
        display_name?: string;
        joined_at?: Date;
        left_at?: Date;
    }[];
    caller_id: string;
    media_type: MediaType;
    tenant_id: string;
    created_at: Date;
    started_at?: Date;
    ended_at?: Date;
    duration_seconds?: number;
    end_reason: EndReason;
    ended_by?: string;
    quality_metrics?: CallQualityMetrics;
}

export interface CallQualityMetrics {
    average_latency_ms?: number;
    packet_loss_percentage?: number;
    jitter_ms?: number;
}
