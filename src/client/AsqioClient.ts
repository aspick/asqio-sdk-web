import type { AsqioConfig } from '../types/config';
import type {
  CreateTicketParams,
  SendMessageParams,
  RegisterDeviceParams,
  UpdateDeviceParams,
  PaginationParams,
  TicketListResponse,
  TopicListResponse,
  MessageListResponse,
  UnreadCountResponse,
  ApiErrorResponse,
} from '../types/api';
import type { TicketWithMessages, Ticket, Message, Device, Topic } from '../types/models';
import { AsqioError, AsqioNetworkError } from './errors';
import { detectDeviceInfo } from './device-info';

export class AsqioClient {
  private readonly baseUrl: string;
  private readonly tenantKey: string;
  private readonly getToken: () => Promise<string>;
  private readonly appVersion?: string;

  constructor(config: AsqioConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.tenantKey = config.tenantKey;
    this.getToken = config.getToken;
    this.appVersion = config.appVersion;
  }

  // --- Topics ---

  async getTopics(): Promise<Topic[]> {
    const res = await this.request<TopicListResponse>('/topics');
    return res.topics;
  }

  // --- Tickets ---

  async getTickets(params?: PaginationParams): Promise<TicketListResponse> {
    const query = this.buildQuery(params);
    return this.request<TicketListResponse>(`/tickets${query}`);
  }

  async getTicket(id: string): Promise<TicketWithMessages> {
    return this.request<TicketWithMessages>(`/tickets/${id}`);
  }

  async createTicket(params: CreateTicketParams): Promise<Ticket> {
    const deviceInfo = detectDeviceInfo();
    const body = {
      ...params,
      platform: params.platform ?? deviceInfo.platform,
      os_version: params.os_version ?? deviceInfo.os_version,
      device_model: params.device_model ?? deviceInfo.device_model,
      locale: params.locale ?? deviceInfo.locale,
      timezone: params.timezone ?? deviceInfo.timezone,
      app_version: params.app_version ?? this.appVersion,
    };
    return this.request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // --- Messages ---

  async getMessages(ticketId: string, params?: PaginationParams): Promise<MessageListResponse> {
    const query = this.buildQuery(params);
    return this.request<MessageListResponse>(`/tickets/${ticketId}/messages${query}`);
  }

  async sendMessage(ticketId: string, params: SendMessageParams): Promise<Message> {
    return this.request<Message>(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: { body: params.body } }),
    });
  }

  // --- Read status ---

  async markAsRead(ticketId: string): Promise<void> {
    await this.request<void>(`/tickets/${ticketId}/read`, {
      method: 'POST',
    });
  }

  async getUnreadCount(): Promise<number> {
    const res = await this.request<UnreadCountResponse>('/unread_count');
    return res.unread_count;
  }

  // --- Devices ---

  async registerDevice(params: RegisterDeviceParams): Promise<Device> {
    return this.request<Device>('/devices', {
      method: 'POST',
      body: JSON.stringify({ device: params }),
    });
  }

  async updateDevice(id: string, params: UpdateDeviceParams): Promise<Device> {
    return this.request<Device>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ device: params }),
    });
  }

  async deleteDevice(id: string): Promise<void> {
    await this.request<void>(`/devices/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Internal ---

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let token: string;
    try {
      token = await this.getToken();
    } catch (e) {
      throw new AsqioNetworkError('Failed to retrieve auth token', e);
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Key': this.tenantKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    let response: Response;
    try {
      response = await fetch(url, { ...init, headers });
    } catch (e) {
      throw new AsqioNetworkError('Network request failed', e);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      let errorBody: ApiErrorResponse | undefined;
      try {
        errorBody = await response.json() as ApiErrorResponse;
      } catch {
        // ignore parse errors
      }
      throw new AsqioError(
        errorBody?.error ?? `Request failed with status ${response.status}`,
        errorBody?.code ?? 'INTERNAL_SERVER_ERROR',
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  private buildQuery(params?: PaginationParams): string {
    if (!params) return '';
    const search = new URLSearchParams();
    if (params.page != null) search.set('page', String(params.page));
    if (params.per_page != null) search.set('per_page', String(params.per_page));
    const qs = search.toString();
    return qs ? `?${qs}` : '';
  }
}
