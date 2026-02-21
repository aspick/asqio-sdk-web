import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AsqioProvider } from '../../src/context/AsqioContext';
import { useTopics } from '../../src/hooks/useTopics';
import type { Topic } from '../../src/types';

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
  getTopics: vi.fn(),
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

const sampleTopics: Topic[] = [
  { id: 'topic-1', name: 'お支払い' },
  { id: 'topic-2', name: 'アカウント' },
  { id: 'topic-3', name: '技術サポート' },
];

describe('useTopics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch topics on mount', async () => {
    mockClient.getTopics.mockResolvedValue(sampleTopics);
    const { result } = renderHook(() => useTopics(), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.topics).toEqual(sampleTopics);
    expect(result.current.error).toBeNull();
    expect(mockClient.getTopics).toHaveBeenCalledTimes(1);
  });

  it('should set error on failure', async () => {
    mockClient.getTopics.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useTopics(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.topics).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should return empty array when no topics exist', async () => {
    mockClient.getTopics.mockResolvedValue([]);
    const { result } = renderHook(() => useTopics(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.topics).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
