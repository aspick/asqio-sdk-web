import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThreadDetail } from '../../src/components/ThreadDetail/ThreadDetail';
import type { TicketWithMessages, Message } from '../../src/types';

// ---------------------------------------------------------------------------
// Mock hooks at the module level
// ---------------------------------------------------------------------------

const mockRefetch = vi.fn();
const mockMarkAsRead = vi.fn();
const mockSend = vi.fn();

vi.mock('../../src/hooks/useTicket', () => ({
  useTicket: vi.fn(),
}));

vi.mock('../../src/hooks/useMarkAsRead', () => ({
  useMarkAsRead: vi.fn(),
}));

vi.mock('../../src/hooks/useSendMessage', () => ({
  useSendMessage: vi.fn(),
}));

import { useTicket } from '../../src/hooks/useTicket';
import { useMarkAsRead } from '../../src/hooks/useMarkAsRead';
import { useSendMessage } from '../../src/hooks/useSendMessage';

const mockedUseTicket = vi.mocked(useTicket);
const mockedUseMarkAsRead = vi.mocked(useMarkAsRead);
const mockedUseSendMessage = vi.mocked(useSendMessage);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleMessage1: Message = {
  id: 'msg-1',
  sender_type: 'user',
  sender_id: 'user-1',
  body: 'Hello, I have a question.',
  created_at: '2026-01-15T10:00:00Z',
};

const sampleMessage2: Message = {
  id: 'msg-2',
  sender_type: 'operator',
  sender_id: 'op-1',
  body: 'Sure, how can I help you?',
  created_at: '2026-01-15T10:05:00Z',
};

const sampleTicket: TicketWithMessages = {
  id: 'ticket-1',
  title: 'Test Ticket',
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T10:05:00Z',
  messages: [sampleMessage1, sampleMessage2],
};

const untitledTicket: TicketWithMessages = {
  ...sampleTicket,
  title: null,
};

// ---------------------------------------------------------------------------
// Helper to set up default mocks
// ---------------------------------------------------------------------------

function setupDefaultMocks(overrides?: {
  ticket?: TicketWithMessages | null;
  loading?: boolean;
  error?: Error | null;
  sending?: boolean;
}) {
  mockedUseTicket.mockReturnValue({
    ticket: overrides?.ticket !== undefined ? overrides.ticket : sampleTicket,
    loading: overrides?.loading ?? false,
    error: overrides?.error ?? null,
    refetch: mockRefetch,
  });

  mockMarkAsRead.mockResolvedValue(undefined);
  mockedUseMarkAsRead.mockReturnValue({
    markAsRead: mockMarkAsRead,
    loading: false,
    error: null,
  });

  mockedUseSendMessage.mockReturnValue({
    send: mockSend,
    loading: overrides?.sending ?? false,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThreadDetail', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Loading state -------------------------------------------------------

  it('should show loading indicator when loading with no ticket', () => {
    setupDefaultMocks({ ticket: null, loading: true });

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  // ---- Error state ---------------------------------------------------------

  it('should show error message when hook returns an error', () => {
    setupDefaultMocks({ error: new Error('Network error') });

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  // ---- Rendering messages ---------------------------------------------------

  it('should render messages from the ticket', () => {
    setupDefaultMocks();

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByText('Hello, I have a question.')).toBeInTheDocument();
    expect(screen.getByText('Sure, how can I help you?')).toBeInTheDocument();
  });

  it('should render the ticket title', () => {
    setupDefaultMocks();

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
  });

  it('should render "(無題)" for tickets with null title', () => {
    setupDefaultMocks({ ticket: untitledTicket });

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByText('(無題)')).toBeInTheDocument();
  });

  // ---- markAsRead on mount --------------------------------------------------

  it('should call markAsRead on mount with the ticketId', () => {
    setupDefaultMocks();

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(mockMarkAsRead).toHaveBeenCalledTimes(1);
    expect(mockMarkAsRead).toHaveBeenCalledWith('ticket-1');
  });

  it('should call markAsRead with the new ticketId when it changes', () => {
    setupDefaultMocks();

    const { rerender } = render(<ThreadDetail ticketId="ticket-1" />);

    expect(mockMarkAsRead).toHaveBeenCalledWith('ticket-1');

    rerender(<ThreadDetail ticketId="ticket-2" />);

    expect(mockMarkAsRead).toHaveBeenCalledWith('ticket-2');
  });

  // ---- Back button ----------------------------------------------------------

  it('should call onBack when back button is clicked', () => {
    setupDefaultMocks();

    const onBack = vi.fn();
    render(<ThreadDetail ticketId="ticket-1" onBack={onBack} />);

    fireEvent.click(screen.getByText('← 戻る'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should not render back button when onBack is not provided', () => {
    setupDefaultMocks();

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.queryByText('← 戻る')).not.toBeInTheDocument();
  });

  // ---- MessageInput presence ------------------------------------------------

  it('should render the message input area', () => {
    setupDefaultMocks();

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument();
    expect(screen.getByText('送信')).toBeInTheDocument();
  });

  it('should disable message input while sending', () => {
    setupDefaultMocks({ sending: true });

    render(<ThreadDetail ticketId="ticket-1" />);

    expect(screen.getByPlaceholderText('メッセージを入力...')).toBeDisabled();
  });

  // ---- Passing ticketId to useTicket ----------------------------------------

  it('should pass the ticketId to useTicket', () => {
    setupDefaultMocks();

    render(<ThreadDetail ticketId="ticket-42" />);

    expect(mockedUseTicket).toHaveBeenCalledWith('ticket-42');
  });
});
