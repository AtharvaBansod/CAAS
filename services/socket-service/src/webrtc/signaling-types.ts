export interface RTCSessionDescriptionInit {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp: string;
}

export interface RTCIceCandidateInit {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    from_user_id: string;
    to_user_id: string;
    call_id?: string;
    data: RTCSessionDescriptionInit | RTCIceCandidateInit;
    timestamp: Date;
}

export interface SignalingValidationError {
    field: string;
    message: string;
}
