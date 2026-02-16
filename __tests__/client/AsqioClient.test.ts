import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsqioClient } from '../../src/client/AsqioClient';
import { AsqioError, AsqioNetworkError } from '../../src/client/errors';
import type { AsqioConfig } from '../../src/types/config';

// Mock device-info module so createTicket auto-fill is deterministic
vi.mock('../../src/client/device-info', () => ({
  detectDeviceInfo: () => ({
    platform: 'web',
    os_version: 'macOS 14.0',
    device_model: 'Chrome 120.0.0.0',
    locale: 'en-US',
    timezone: 'Asia/Tokyo',
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.example.com/api/v1';
const TENANT_KEY = 'test-tenant';
const TOKEN = 'test-token';

function createConfig(overrides: Partial<AsqioConfig> = {}): AsqioConfig {
  return {
    baseUrl: BASE_URL,
    tenantKey: TENANT_KEY,
    getToken: async () => TOKEN,
    ...overrides,
  };
}

/** Build a minimal successful Response object */
function okJson(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    json: async () => body,
    headers: new Headers(),
  } as unknown as Response;
}

/** Build a 204 No Content response */
function noContent(): Response {
  return {
    ok: true,
    status: 204,
    json: async () => {
      throw new Error('No content');
    },
    headers: new Headers(),
  } as unknown as Response;
}

/** Build an error response with JSON body */
function errorJson(
  status: number,
  body: { error: string; code: string },
): Response {
  return {
    ok: false,
    status,
    json: async () => body,
    headers: new Headers(),
  } as unknown as Response;
}

/** Build an error response whose .json() rejects (non-JSON body) */
function errorNonJson(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AsqioClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: AsqioClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    client = new AsqioClient(createConfig());
  });

  // -----------------------------------------------------------------------
  // Shared header / auth assertions helper
  // -----------------------------------------------------------------------

  function expectStandardHeaders(callIndex = 0) {
    const [, init] = fetchMock.mock.calls[callIndex];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(headers['X-Tenant-Key']).toBe(TENANT_KEY);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  }

  // =======================================================================
  // getTickets
  // =======================================================================

  describe('getTickets', () => {
    const ticketListResponse = {
      tickets: [{ id: 't1', title: 'Help', unread: false, created_at: '', updated_at: '', context: null, device_info: null }],
      meta: { current_page: 1, total_pages: 1, total_count: 1, per_page: 20 },
    };

    it('sends GET to /tickets with correct headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticketListResponse));

      const result = await client.getTickets();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets`);
      expect(init.method).toBeUndefined(); // defaults to GET
      expectStandardHeaders();
      expect(result).toEqual(ticketListResponse);
    });

    it('appends pagination query params', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticketListResponse));

      await client.getTickets({ page: 2, per_page: 10 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets?page=2&per_page=10`);
    });

    it('omits query string when params are empty', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticketListResponse));

      await client.getTickets({});

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets`);
    });
  });

  // =======================================================================
  // getTicket
  // =======================================================================

  describe('getTicket', () => {
    const ticketWithMessages = {
      id: 't1',
      title: 'Help',
      unread: false,
      created_at: '',
      updated_at: '',
      context: null,
      device_info: null,
      messages: [{ id: 'm1', sender_type: 'user', sender_id: 'u1', body: 'Hi', created_at: '' }],
    };

    it('sends GET to /tickets/:id with correct headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticketWithMessages));

      const result = await client.getTicket('t1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets/t1`);
      expect(init.method).toBeUndefined();
      expectStandardHeaders();
      expect(result).toEqual(ticketWithMessages);
    });
  });

  // =======================================================================
  // createTicket
  // =======================================================================

  describe('createTicket', () => {
    const ticket = {
      id: 't1',
      title: null,
      context: null,
      device_info: null,
      unread: false,
      created_at: '',
      updated_at: '',
    };

    it('sends POST to /tickets with correct body and headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticket));

      const result = await client.createTicket({ message: 'Hello' });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets`);
      expect(init.method).toBe('POST');
      expectStandardHeaders();

      const body = JSON.parse(init.body as string);
      expect(body.message).toBe('Hello');
      expect(result).toEqual(ticket);
    });

    it('auto-fills device info from detectDeviceInfo()', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticket));

      await client.createTicket({ message: 'Hello' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.platform).toBe('web');
      expect(body.os_version).toBe('macOS 14.0');
      expect(body.device_model).toBe('Chrome 120.0.0.0');
      expect(body.locale).toBe('en-US');
      expect(body.timezone).toBe('Asia/Tokyo');
    });

    it('uses explicit params over auto-detected device info', async () => {
      fetchMock.mockResolvedValueOnce(okJson(ticket));

      await client.createTicket({
        message: 'Hello',
        platform: 'ios',
        os_version: 'iOS 17.0',
        device_model: 'iPhone 15',
        locale: 'ja-JP',
        timezone: 'America/New_York',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.platform).toBe('ios');
      expect(body.os_version).toBe('iOS 17.0');
      expect(body.device_model).toBe('iPhone 15');
      expect(body.locale).toBe('ja-JP');
      expect(body.timezone).toBe('America/New_York');
    });

    it('uses appVersion from config when not provided in params', async () => {
      const clientWithVersion = new AsqioClient(
        createConfig({ appVersion: '2.0.0' }),
      );
      fetchMock.mockResolvedValueOnce(okJson(ticket));

      await clientWithVersion.createTicket({ message: 'Hello' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.app_version).toBe('2.0.0');
    });
  });

  // =======================================================================
  // getMessages
  // =======================================================================

  describe('getMessages', () => {
    const messageListResponse = {
      messages: [{ id: 'm1', sender_type: 'user', sender_id: 'u1', body: 'Hi', created_at: '' }],
      meta: { current_page: 1, total_pages: 1, total_count: 1, per_page: 20 },
    };

    it('sends GET to /tickets/:id/messages with correct headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(messageListResponse));

      const result = await client.getMessages('t1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets/t1/messages`);
      expect(init.method).toBeUndefined();
      expectStandardHeaders();
      expect(result).toEqual(messageListResponse);
    });

    it('appends pagination query params', async () => {
      fetchMock.mockResolvedValueOnce(okJson(messageListResponse));

      await client.getMessages('t1', { page: 3, per_page: 50 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets/t1/messages?page=3&per_page=50`);
    });
  });

  // =======================================================================
  // sendMessage
  // =======================================================================

  describe('sendMessage', () => {
    const message = { id: 'm1', sender_type: 'user', sender_id: 'u1', body: 'Hi', created_at: '' };

    it('sends POST to /tickets/:id/messages with correct body and headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(message));

      const result = await client.sendMessage('t1', { body: 'Hello there' });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets/t1/messages`);
      expect(init.method).toBe('POST');
      expectStandardHeaders();

      const body = JSON.parse(init.body as string);
      expect(body).toEqual({ message: { body: 'Hello there' } });
      expect(result).toEqual(message);
    });
  });

  // =======================================================================
  // markAsRead
  // =======================================================================

  describe('markAsRead', () => {
    it('sends POST to /tickets/:id/read and returns void', async () => {
      fetchMock.mockResolvedValueOnce(noContent());

      const result = await client.markAsRead('t1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/tickets/t1/read`);
      expect(init.method).toBe('POST');
      expectStandardHeaders();
      expect(result).toBeUndefined();
    });
  });

  // =======================================================================
  // getUnreadCount
  // =======================================================================

  describe('getUnreadCount', () => {
    it('sends GET to /unread_count and returns the count number', async () => {
      fetchMock.mockResolvedValueOnce(okJson({ unread_count: 5 }));

      const result = await client.getUnreadCount();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/unread_count`);
      expect(init.method).toBeUndefined();
      expectStandardHeaders();
      expect(result).toBe(5);
    });
  });

  // =======================================================================
  // registerDevice
  // =======================================================================

  describe('registerDevice', () => {
    const device = { id: 'd1', platform: 'web', push_token: 'tok', os_version: 'macOS 14.0' };

    it('sends POST to /devices with correct body and headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(device));

      const params = {
        platform: 'web' as const,
        push_token: 'tok',
        token_type: 'fcm' as const,
        os_version: 'macOS 14.0',
      };
      const result = await client.registerDevice(params);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/devices`);
      expect(init.method).toBe('POST');
      expectStandardHeaders();

      const body = JSON.parse(init.body as string);
      expect(body).toEqual({ device: params });
      expect(result).toEqual(device);
    });
  });

  // =======================================================================
  // updateDevice
  // =======================================================================

  describe('updateDevice', () => {
    const device = { id: 'd1', platform: 'web', push_token: 'new-tok' };

    it('sends PUT to /devices/:id with correct body and headers', async () => {
      fetchMock.mockResolvedValueOnce(okJson(device));

      const params = { push_token: 'new-tok' };
      const result = await client.updateDevice('d1', params);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/devices/d1`);
      expect(init.method).toBe('PUT');
      expectStandardHeaders();

      const body = JSON.parse(init.body as string);
      expect(body).toEqual({ device: params });
      expect(result).toEqual(device);
    });
  });

  // =======================================================================
  // deleteDevice
  // =======================================================================

  describe('deleteDevice', () => {
    it('sends DELETE to /devices/:id and returns void', async () => {
      fetchMock.mockResolvedValueOnce(noContent());

      const result = await client.deleteDevice('d1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/devices/d1`);
      expect(init.method).toBe('DELETE');
      expectStandardHeaders();
      expect(result).toBeUndefined();
    });
  });

  // =======================================================================
  // Error handling
  // =======================================================================

  describe('error handling', () => {
    it('throws AsqioError when API returns non-ok status with JSON body', async () => {
      fetchMock.mockResolvedValueOnce(
        errorJson(422, { error: 'Validation failed', code: 'VALIDATION_ERROR' }),
      );

      await expect(client.getTickets()).rejects.toThrow(AsqioError);

      try {
        fetchMock.mockResolvedValueOnce(
          errorJson(422, { error: 'Validation failed', code: 'VALIDATION_ERROR' }),
        );
        await client.getTickets();
      } catch (e) {
        expect(e).toBeInstanceOf(AsqioError);
        const err = e as AsqioError;
        expect(err.message).toBe('Validation failed');
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.statusCode).toBe(422);
      }
    });

    it('throws AsqioError with fallback message when JSON body parse fails', async () => {
      fetchMock.mockResolvedValueOnce(errorNonJson(500));

      try {
        await client.getTickets();
      } catch (e) {
        expect(e).toBeInstanceOf(AsqioError);
        const err = e as AsqioError;
        expect(err.message).toBe('Request failed with status 500');
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
        expect(err.statusCode).toBe(500);
      }
    });

    it('throws AsqioNetworkError when fetch itself throws (network failure)', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(client.getTickets()).rejects.toThrow(AsqioNetworkError);

      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      try {
        await client.getTickets();
      } catch (e) {
        expect(e).toBeInstanceOf(AsqioNetworkError);
        const err = e as AsqioNetworkError;
        expect(err.message).toBe('Network request failed');
        expect(err.cause).toBeInstanceOf(TypeError);
      }
    });

    it('throws AsqioNetworkError when getToken fails', async () => {
      const failClient = new AsqioClient(
        createConfig({
          getToken: async () => {
            throw new Error('Token expired');
          },
        }),
      );

      await expect(failClient.getTickets()).rejects.toThrow(AsqioNetworkError);

      try {
        await failClient.getTickets();
      } catch (e) {
        expect(e).toBeInstanceOf(AsqioNetworkError);
        const err = e as AsqioNetworkError;
        expect(err.message).toBe('Failed to retrieve auth token');
      }
    });
  });

  // =======================================================================
  // baseUrl trailing slash normalization
  // =======================================================================

  describe('baseUrl normalization', () => {
    it('strips trailing slashes from baseUrl', async () => {
      const clientSlash = new AsqioClient(
        createConfig({ baseUrl: 'https://api.example.com/api/v1///' }),
      );
      fetchMock.mockResolvedValueOnce(okJson({ unread_count: 0 }));

      await clientSlash.getUnreadCount();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.example.com/api/v1/unread_count');
    });
  });
});
