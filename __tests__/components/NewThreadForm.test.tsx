import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NewThreadForm } from '../../src/components/NewThreadForm/NewThreadForm';
import type { Ticket, Topic } from '../../src/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();
const mockTopics: Topic[] = [
  { id: 'topic-1', name: 'お支払い' },
  { id: 'topic-2', name: 'アカウント' },
];

vi.mock('../../src/hooks/useCreateTicket', () => ({
  useCreateTicket: () => ({
    create: mockCreate,
    loading: false,
    error: null,
  }),
}));

let topicsReturnValue = { topics: mockTopics, loading: false, error: null, refetch: vi.fn() };

vi.mock('../../src/hooks/useTopics', () => ({
  useTopics: () => topicsReturnValue,
}));

const sampleTicket: Ticket = {
  id: 'ticket-new',
  title: 'New Ticket',
  topic: { id: 'topic-1', name: 'お支払い' },
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NewThreadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(sampleTicket);
    topicsReturnValue = { topics: mockTopics, loading: false, error: null, refetch: vi.fn() };
  });

  afterEach(() => {
    cleanup();
  });

  it('should render topic selector when topics are available', () => {
    render(<NewThreadForm />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('トピックを選択（任意）')).toBeInTheDocument();
    expect(screen.getByText('お支払い')).toBeInTheDocument();
    expect(screen.getByText('アカウント')).toBeInTheDocument();
  });

  it('should not render topic selector when no topics exist', () => {
    topicsReturnValue = { topics: [], loading: false, error: null, refetch: vi.fn() };
    render(<NewThreadForm />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should submit with topic_id when a topic is selected', async () => {
    const onCreated = vi.fn();
    render(<NewThreadForm onCreated={onCreated} />);

    // Select a topic
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'topic-1' } });

    // Enter message
    fireEvent.change(screen.getByPlaceholderText('お問い合わせ内容を入力してください'), {
      target: { value: 'テストメッセージ' },
    });

    // Submit
    fireEvent.click(screen.getByText('送信'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        message: 'テストメッセージ',
        title: undefined,
        topic_id: 'topic-1',
        context: undefined,
      });
    });
  });

  it('should submit without topic_id when no topic is selected', async () => {
    const onCreated = vi.fn();
    render(<NewThreadForm onCreated={onCreated} />);

    // Enter message without selecting a topic
    fireEvent.change(screen.getByPlaceholderText('お問い合わせ内容を入力してください'), {
      target: { value: 'テストメッセージ' },
    });

    // Submit
    fireEvent.click(screen.getByText('送信'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        message: 'テストメッセージ',
        title: undefined,
        topic_id: undefined,
        context: undefined,
      });
    });
  });
});
