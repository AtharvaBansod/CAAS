export interface FileUploadedEvent {
  file_id: string;
  tenant_id: string;
  uploader_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: number;
}

export interface FileDeletedEvent {
  file_id: string;
  tenant_id: string;
  deleted_by: string;
  deleted_at: number;
  permanent: boolean;
}

export interface FileSharedEvent {
  file_id: string;
  tenant_id: string;
  shared_by: string;
  shared_with: string; // user_id or conversation_id
  shared_at: number;
  permissions: 'read' | 'write' | 'admin';
}

export interface FileProcessingStartedEvent {
  file_id: string;
  tenant_id: string;
  processing_id: string;
  started_at: number;
  job_type: 'thumbnail' | 'virus_scan' | 'transcoding';
}

export interface FileProcessingCompletedEvent {
  file_id: string;
  tenant_id: string;
  processing_id: string;
  completed_at: number;
  result: any;
}

export interface FileProcessingFailedEvent {
  file_id: string;
  tenant_id: string;
  processing_id: string;
  failed_at: number;
  error: string;
}
