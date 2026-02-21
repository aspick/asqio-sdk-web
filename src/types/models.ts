export interface Topic {
  id: string;
  name: string;
}

export interface Ticket {
  id: string;
  title: string | null;
  topic: Topic | null;
  context: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
  unread: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_type: 'user' | 'operator';
  sender_id: string;
  body: string;
  created_at: string;
}

export interface TicketWithMessages extends Ticket {
  messages: Message[];
}

export interface Device {
  id: string;
  platform: 'ios' | 'android' | 'web';
  push_token?: string;
  os_version?: string;
  app_version?: string;
  device_model?: string;
  locale?: string;
  timezone?: string;
}

export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}
