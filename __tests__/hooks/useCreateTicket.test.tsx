import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AsqioProvider } from '../../src/context/AsqioContext';
import { useCreateTicket } from '../../src/hooks/useCreateTicket';
import type { Ticket, CreateTicketParams } from '../../src/types';

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
  id: 'ticket-new',
  title: 'New Ticket',
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const createParams: CreateTicketParams = {
  message: 'I need help',
  title: 'New Ticket',
};

describe('useCreateTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading false and no error', () => {
    const { result } = renderHook(() => useCreateTicket(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.create).toBe('function');
  });

  it('should set loading true during request', async () => {
    let resolveCreate!: (value: Ticket) => void;
    mockClient.createTicket.mockReturnValue(
      new Promise<Ticket>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const { result } = renderHook(() => useCreateTicket(), { wrapper });

    let createPromise: Promise<Ticket>;
    act(() => {
      createPromise = result.current.create(createParams);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveCreate(sampleTicket);
      await createPromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should return the created ticket on success', async () => {
    mockClient.createTicket.mockResolvedValue(sampleTicket);
    const { result } = renderHook(() => useCreateTicket(), { wrapper });

    let ticket: Ticket | undefined;
    await act(async () => {
      ticket = await result.current.create(createParams);
    });

    expect(ticket).toEqual(sampleTicket);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockClient.createTicket).toHaveBeenCalledWith(createParams);
  });

  it('should set error on failure and rethrow', async () => {
    const error = new Error('Validation error');
    mockClient.createTicket.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateTicket(), { wrapper });

    await act(async () => {
      await expect(result.current.create(createParams)).rejects.toThrow('Validation error');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Validation error');
  });

  it('should wrap non-Error rejects in an Error and rethrow', async () => {
    mockClient.createTicket.mockRejectedValue('string error');
    const { result } = renderHook(() => useCreateTicket(), { wrapper });

    await act(async () => {
      await expect(result.current.create(createParams)).rejects.toThrow('string error');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('should clear previous error on new create call', async () => {
    mockClient.createTicket.mockRejectedValue(new Error('First error'));
    const { result } = renderHook(() => useCreateTicket(), { wrapper });

    await act(async () => {
      await result.current.create(createParams).catch(() => {});
    });

    expect(result.current.error?.message).toBe('First error');

    mockClient.createTicket.mockResolvedValue(sampleTicket);

    await act(async () => {
      await result.current.create(createParams);
    });

    expect(result.current.error).toBeNull();
  });
});
