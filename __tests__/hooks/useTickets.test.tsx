import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AsqioProvider } from '../../src/context/AsqioContext';
import { useTickets } from '../../src/hooks/useTickets';
import type { Ticket, PaginationMeta, TicketListResponse } from '../../src/types';

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

const sampleTicket: Ticket = {
  id: 'ticket-1',
  title: 'Test Ticket',
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleMeta: PaginationMeta = {
  current_page: 1,
  total_pages: 3,
  total_count: 25,
  per_page: 10,
};

const sampleResponse: TicketListResponse = {
  tickets: [sampleTicket],
  meta: sampleMeta,
};

describe('useTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have loading true initially', () => {
    mockClient.getTickets.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useTickets(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.tickets).toEqual([]);
    expect(result.current.meta).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should populate tickets after fetch', async () => {
    mockClient.getTickets.mockResolvedValue(sampleResponse);
    const { result } = renderHook(() => useTickets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tickets).toEqual([sampleTicket]);
    expect(result.current.meta).toEqual(sampleMeta);
    expect(result.current.error).toBeNull();
  });

  it('should set error state on failure', async () => {
    mockClient.getTickets.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useTickets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.tickets).toEqual([]);
  });

  it('should wrap non-Error rejects in an Error', async () => {
    mockClient.getTickets.mockRejectedValue('string error');
    const { result } = renderHook(() => useTickets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('should refetch tickets', async () => {
    mockClient.getTickets.mockResolvedValue(sampleResponse);
    const { result } = renderHook(() => useTickets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedTicket = { ...sampleTicket, id: 'ticket-2', title: 'Updated' };
    const updatedResponse: TicketListResponse = {
      tickets: [updatedTicket],
      meta: { ...sampleMeta, total_count: 30 },
    };
    mockClient.getTickets.mockResolvedValue(updatedResponse);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tickets).toEqual([updatedTicket]);
    expect(result.current.meta?.total_count).toBe(30);
  });

  it('should fetch a specific page with fetchPage', async () => {
    mockClient.getTickets.mockResolvedValue(sampleResponse);
    const { result } = renderHook(() => useTickets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const page2Ticket = { ...sampleTicket, id: 'ticket-page2' };
    const page2Response: TicketListResponse = {
      tickets: [page2Ticket],
      meta: { ...sampleMeta, current_page: 2 },
    };
    mockClient.getTickets.mockResolvedValue(page2Response);

    await act(async () => {
      await result.current.fetchPage(2);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tickets).toEqual([page2Ticket]);
    expect(result.current.meta?.current_page).toBe(2);
    // Verify getTickets was called with page parameter
    expect(mockClient.getTickets).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('should pass pagination params on initial fetch', async () => {
    mockClient.getTickets.mockResolvedValue(sampleResponse);
    renderHook(() => useTickets({ page: 1, per_page: 5 }), { wrapper });

    await waitFor(() => {
      expect(mockClient.getTickets).toHaveBeenCalledWith({ page: 1, per_page: 5 });
    });
  });
});
