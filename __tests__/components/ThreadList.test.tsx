import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThreadList } from '../../src/components/ThreadList/ThreadList';
import type { Ticket, PaginationMeta } from '../../src/types';

// Mock the useTickets hook at the module level so the component
// never attempts to call useAsqioClient().
const mockFetchPage = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../../src/hooks/useTickets', () => ({
  useTickets: vi.fn(),
}));

// Import the mocked module so we can control its return value per test.
import { useTickets } from '../../src/hooks/useTickets';
const mockedUseTickets = vi.mocked(useTickets);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleTicket: Ticket = {
  id: 'ticket-1',
  title: 'First Ticket',
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

const unreadTicket: Ticket = {
  id: 'ticket-2',
  title: 'Unread Ticket',
  context: null,
  device_info: null,
  unread: true,
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-16T00:00:00Z',
};

const untitledTicket: Ticket = {
  id: 'ticket-3',
  title: null,
  context: null,
  device_info: null,
  unread: false,
  created_at: '2026-01-03T00:00:00Z',
  updated_at: '2026-01-17T00:00:00Z',
};

const sampleMeta: PaginationMeta = {
  current_page: 1,
  total_pages: 3,
  total_count: 25,
  per_page: 10,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThreadList', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Loading state -------------------------------------------------------

  it('should show loading indicator when loading with no tickets', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [],
      meta: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  // ---- Error state ---------------------------------------------------------

  it('should show error message when hook returns an error', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [],
      meta: null,
      loading: false,
      error: new Error('Network error'),
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  // ---- Empty state ---------------------------------------------------------

  it('should show empty message when there are no tickets', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('問い合わせはありません')).toBeInTheDocument();
  });

  // ---- Rendering ticket items -----------------------------------------------

  it('should render ticket titles', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket, unreadTicket],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('First Ticket')).toBeInTheDocument();
    expect(screen.getByText('Unread Ticket')).toBeInTheDocument();
  });

  it('should render "(無題)" for tickets with null title', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [untitledTicket],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('(無題)')).toBeInTheDocument();
  });

  it('should render unread badge for unread tickets', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket, unreadTicket],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    const { container } = render(<ThreadList onSelectTicket={vi.fn()} />);

    // The unreadBadge is a <span> with the CSS class "unreadBadge".
    // Since css.modules classNameStrategy is 'non-scoped', the class name stays as-is.
    const badges = container.querySelectorAll('.unreadBadge');
    expect(badges).toHaveLength(1);
  });

  // ---- Click handlers -------------------------------------------------------

  it('should call onSelectTicket with the ticket when clicked', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    const onSelectTicket = vi.fn();
    render(<ThreadList onSelectTicket={onSelectTicket} />);

    fireEvent.click(screen.getByText('First Ticket'));

    expect(onSelectTicket).toHaveBeenCalledTimes(1);
    expect(onSelectTicket).toHaveBeenCalledWith(sampleTicket);
  });

  it('should call onNewThread when the new thread button is clicked', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    const onNewThread = vi.fn();
    render(<ThreadList onSelectTicket={vi.fn()} onNewThread={onNewThread} />);

    fireEvent.click(screen.getByText('新規作成'));

    expect(onNewThread).toHaveBeenCalledTimes(1);
  });

  it('should not render new thread button when onNewThread is not provided', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [],
      meta: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.queryByText('新規作成')).not.toBeInTheDocument();
  });

  // ---- Pagination -----------------------------------------------------------

  it('should render pagination controls when there are multiple pages', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket],
      meta: sampleMeta,
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('前へ')).toBeInTheDocument();
    expect(screen.getByText('次へ')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should disable "前へ" button on the first page', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket],
      meta: { ...sampleMeta, current_page: 1 },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('前へ')).toBeDisabled();
    expect(screen.getByText('次へ')).not.toBeDisabled();
  });

  it('should disable "次へ" button on the last page', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket],
      meta: { ...sampleMeta, current_page: 3, total_pages: 3 },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.getByText('次へ')).toBeDisabled();
    expect(screen.getByText('前へ')).not.toBeDisabled();
  });

  it('should call fetchPage when pagination buttons are clicked', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket],
      meta: { ...sampleMeta, current_page: 2 },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    fireEvent.click(screen.getByText('次へ'));
    expect(mockFetchPage).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByText('前へ'));
    expect(mockFetchPage).toHaveBeenCalledWith(1);
  });

  it('should not render pagination when only one page exists', () => {
    mockedUseTickets.mockReturnValue({
      tickets: [sampleTicket],
      meta: { ...sampleMeta, current_page: 1, total_pages: 1 },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchPage: mockFetchPage,
    });

    render(<ThreadList onSelectTicket={vi.fn()} />);

    expect(screen.queryByText('前へ')).not.toBeInTheDocument();
    expect(screen.queryByText('次へ')).not.toBeInTheDocument();
  });
});
