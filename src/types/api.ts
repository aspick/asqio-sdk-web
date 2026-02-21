import type { Message, PaginationMeta, Ticket, TicketWithMessages, Device, Topic } from './models';

// --- Request types ---

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface CreateTicketParams {
  message: string;
  title?: string;
  topic_id?: string;
  context?: Record<string, unknown>;
  platform?: string;
  os_version?: string;
  app_version?: string;
  device_model?: string;
  locale?: string;
  timezone?: string;
}

export interface SendMessageParams {
  body: string;
}

export interface RegisterDeviceParams {
  platform: 'ios' | 'android' | 'web';
  push_token: string;
  token_type: 'apns' | 'fcm';
  os_version?: string;
  app_version?: string;
  device_model?: string;
  locale?: string;
  timezone?: string;
}

export interface UpdateDeviceParams {
  push_token?: string;
  os_version?: string;
  app_version?: string;
}

// --- Response types ---

export interface TicketListResponse {
  tickets: Ticket[];
  meta: PaginationMeta;
}

export interface MessageListResponse {
  messages: Message[];
  meta: PaginationMeta;
}

export interface TopicListResponse {
  topics: Topic[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

// Re-export for convenience
export type { Ticket, TicketWithMessages, Message, Device, Topic, PaginationMeta };

// --- Error types ---

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'TENANT_KEY_REQUIRED'
  | 'TENANT_NOT_FOUND'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
}
