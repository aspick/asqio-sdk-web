import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AsqioProvider } from '../../src/context/AsqioContext';
import { useUnreadCount } from '../../src/hooks/useUnreadCount';

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

describe('useUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have loading true initially', () => {
    mockClient.getUnreadCount.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.count).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should return the unread count after fetch', async () => {
    mockClient.getUnreadCount.mockResolvedValue(5);
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('should set error state on failure', async () => {
    mockClient.getUnreadCount.mockRejectedValue(new Error('Fetch failed'));
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Fetch failed');
    expect(result.current.count).toBe(0);
  });

  it('should wrap non-Error rejects in an Error', async () => {
    mockClient.getUnreadCount.mockRejectedValue('string error');
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('should refetch the unread count', async () => {
    mockClient.getUnreadCount.mockResolvedValue(3);
    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(3);

    mockClient.getUnreadCount.mockResolvedValue(7);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(7);
  });

  it('should poll at the specified interval', async () => {
    vi.useFakeTimers();
    mockClient.getUnreadCount.mockResolvedValue(1);

    const { result } = renderHook(
      () => useUnreadCount({ pollInterval: 5000 }),
      { wrapper },
    );

    // Wait for the initial fetch to complete
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.count).toBe(1);
    expect(mockClient.getUnreadCount).toHaveBeenCalledTimes(1);

    // Advance timer to trigger the first poll
    mockClient.getUnreadCount.mockResolvedValue(2);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await vi.waitFor(() => {
      expect(mockClient.getUnreadCount).toHaveBeenCalledTimes(2);
    });

    // Advance timer to trigger the second poll
    mockClient.getUnreadCount.mockResolvedValue(4);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await vi.waitFor(() => {
      expect(mockClient.getUnreadCount).toHaveBeenCalledTimes(3);
    });
  });

  it('should not poll when pollInterval is not set', async () => {
    vi.useFakeTimers();
    mockClient.getUnreadCount.mockResolvedValue(1);

    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Only the initial fetch
    expect(mockClient.getUnreadCount).toHaveBeenCalledTimes(1);

    // Advance timer - no additional calls expected
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockClient.getUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('should clean up interval on unmount', async () => {
    vi.useFakeTimers();
    mockClient.getUnreadCount.mockResolvedValue(1);

    const { result, unmount } = renderHook(
      () => useUnreadCount({ pollInterval: 5000 }),
      { wrapper },
    );

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    unmount();

    // Advance timer after unmount - should not call again
    const callCountAfterUnmount = mockClient.getUnreadCount.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockClient.getUnreadCount).toHaveBeenCalledTimes(callCountAfterUnmount);
  });
});
