import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AsqioProvider } from '../../src/context/AsqioContext';
import { useTicket } from '../../src/hooks/useTicket';
import type { TicketWithMessages } from '../../src/types';

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

const sampleTicket: TicketWithMessages = {
  id: 'ticket-1',
  title: 'Test Ticket',
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  messages: [
    {
      id: 'msg-1',
      sender_type: 'user',
      sender_id: 'user-1',
      body: 'Hello',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
};

describe('useTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have loading true initially', () => {
    mockClient.getTicket.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useTicket('ticket-1'), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.ticket).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should populate ticket data after fetch', async () => {
    mockClient.getTicket.mockResolvedValue(sampleTicket);
    const { result } = renderHook(() => useTicket('ticket-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ticket).toEqual(sampleTicket);
    expect(result.current.error).toBeNull();
    expect(mockClient.getTicket).toHaveBeenCalledWith('ticket-1');
  });

  it('should set error state on failure', async () => {
    mockClient.getTicket.mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useTicket('invalid-id'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Not found');
    expect(result.current.ticket).toBeNull();
  });

  it('should wrap non-Error rejects in an Error', async () => {
    mockClient.getTicket.mockRejectedValue('string error');
    const { result } = renderHook(() => useTicket('ticket-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('should refetch ticket data', async () => {
    mockClient.getTicket.mockResolvedValue(sampleTicket);
    const { result } = renderHook(() => useTicket('ticket-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedTicket: TicketWithMessages = {
      ...sampleTicket,
      messages: [
        ...sampleTicket.messages,
        {
          id: 'msg-2',
          sender_type: 'operator',
          sender_id: 'op-1',
          body: 'Hi there!',
          created_at: '2026-01-01T01:00:00Z',
        },
      ],
    };
    mockClient.getTicket.mockResolvedValue(updatedTicket);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ticket).toEqual(updatedTicket);
    expect(result.current.ticket?.messages).toHaveLength(2);
  });

  it('should clear error and set loading on refetch', async () => {
    mockClient.getTicket.mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useTicket('ticket-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    mockClient.getTicket.mockResolvedValue(sampleTicket);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.ticket).toEqual(sampleTicket);
  });
});
