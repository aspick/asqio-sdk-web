import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AsqioProvider } from '../../src/context/AsqioContext';
import { useSendMessage } from '../../src/hooks/useSendMessage';
import type { Message } from '../../src/types';

const mockClient = {
  getTickets: vi.fn(),
  getTicket: vi.fn(),
  createTicket: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
  registerDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
};

vi.mock('../../src/client/AsqioClient', () => ({
  AsqioClient: vi.fn(() => mockClient),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AsqioProvider
    baseUrl="https://api.example.com"
    tenantKey="test"
    getToken={async () => 'token'}
  >
    {children}
  </AsqioProvider>
);

const sampleMessage: Message = {
  id: 'msg-1',
  sender_type: 'user',
  sender_id: 'user-1',
  body: 'Hello, I need help',
  created_at: '2026-01-01T00:00:00Z',
};

describe('useSendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading false and no error', () => {
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.send).toBe('function');
  });

  it('should set loading true during request', async () => {
    let resolveSend!: (value: Message) => void;
    mockClient.sendMessage.mockReturnValue(
      new Promise<Message>((resolve) => {
        resolveSend = resolve;
      }),
    );

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    let sendPromise: Promise<Message>;
    act(() => {
      sendPromise = result.current.send('ticket-1', 'Hello');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveSend(sampleMessage);
      await sendPromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should return the sent message on success', async () => {
    mockClient.sendMessage.mockResolvedValue(sampleMessage);
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    let message: Message | undefined;
    await act(async () => {
      message = await result.current.send('ticket-1', 'Hello, I need help');
    });

    expect(message).toEqual(sampleMessage);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockClient.sendMessage).toHaveBeenCalledWith('ticket-1', {
      body: 'Hello, I need help',
    });
  });

  it('should set error on failure and rethrow', async () => {
    const error = new Error('Send failed');
    mockClient.sendMessage.mockRejectedValue(error);
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await expect(
        result.current.send('ticket-1', 'Hello'),
      ).rejects.toThrow('Send failed');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Send failed');
  });

  it('should wrap non-Error rejects in an Error and rethrow', async () => {
    mockClient.sendMessage.mockRejectedValue('string error');
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await expect(
        result.current.send('ticket-1', 'Hello'),
      ).rejects.toThrow('string error');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('should clear previous error on new send call', async () => {
    mockClient.sendMessage.mockRejectedValue(new Error('First error'));
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.send('ticket-1', 'msg').catch(() => {});
    });

    expect(result.current.error?.message).toBe('First error');

    mockClient.sendMessage.mockResolvedValue(sampleMessage);

    await act(async () => {
      await result.current.send('ticket-1', 'msg');
    });

    expect(result.current.error).toBeNull();
  });
});
