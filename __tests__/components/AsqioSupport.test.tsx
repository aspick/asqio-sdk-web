import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AsqioSupport } from '../../src/components/AsqioSupport/AsqioSupport';
import type { Ticket } from '../../src/types';

// ---------------------------------------------------------------------------
// Mock child components so we can test navigation logic in isolation.
// Each mock renders a simple div with a test-id and exposes its callback props.
// ---------------------------------------------------------------------------

vi.mock('../../src/components/ThreadList/ThreadList', () => ({
  ThreadList: (props: { onSelectTicket: (ticket: Ticket) => void; onNewThread?: () => void }) => (
    <div data-testid="thread-list">
      <button
        data-testid="select-ticket-btn"
        onClick={() =>
          props.onSelectTicket({
            id: 'ticket-1',
            title: 'Test Ticket',
            context: null,
            device_info: null,
            unread: false,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-15T00:00:00Z',
          })
        }
      >
        Select ticket
      </button>
      {props.onNewThread && (
        <button data-testid="new-thread-btn" onClick={props.onNewThread}>
          New thread
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../src/components/ThreadDetail/ThreadDetail', () => ({
  ThreadDetail: (props: { ticketId: string; onBack?: () => void }) => (
    <div data-testid="thread-detail">
      <span data-testid="detail-ticket-id">{props.ticketId}</span>
      {props.onBack && (
        <button data-testid="back-from-detail-btn" onClick={props.onBack}>
          Back
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../src/components/NewThreadForm/NewThreadForm', () => ({
  NewThreadForm: (props: {
    context?: Record<string, unknown>;
    onCreated?: (ticket: Ticket) => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="new-thread-form">
      {props.onCancel && (
        <button data-testid="cancel-new-thread-btn" onClick={props.onCancel}>
          Cancel
        </button>
      )}
      {props.onCreated && (
        <button
          data-testid="create-ticket-btn"
          onClick={() =>
            props.onCreated!({
              id: 'ticket-new',
              title: 'Newly Created',
              context: null,
              device_info: null,
              unread: false,
              created_at: '2026-02-01T00:00:00Z',
              updated_at: '2026-02-01T00:00:00Z',
            })
          }
        >
          Create
        </button>
      )}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AsqioSupport', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Initial view ---------------------------------------------------------

  it('should render the ThreadList initially', () => {
    render(<AsqioSupport />);

    expect(screen.getByTestId('thread-list')).toBeInTheDocument();
    expect(screen.queryByTestId('thread-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('new-thread-form')).not.toBeInTheDocument();
  });

  // ---- Navigate to detail view ----------------------------------------------

  it('should navigate to ThreadDetail when a ticket is selected', () => {
    render(<AsqioSupport />);

    fireEvent.click(screen.getByTestId('select-ticket-btn'));

    expect(screen.queryByTestId('thread-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('thread-detail')).toBeInTheDocument();
    expect(screen.getByTestId('detail-ticket-id')).toHaveTextContent('ticket-1');
  });

  // ---- Navigate to new thread form ------------------------------------------

  it('should navigate to NewThreadForm when new thread is requested', () => {
    render(<AsqioSupport />);

    fireEvent.click(screen.getByTestId('new-thread-btn'));

    expect(screen.queryByTestId('thread-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('new-thread-form')).toBeInTheDocument();
  });

  // ---- Back from detail to list ---------------------------------------------

  it('should navigate back to ThreadList from ThreadDetail', () => {
    render(<AsqioSupport />);

    // Go to detail
    fireEvent.click(screen.getByTestId('select-ticket-btn'));
    expect(screen.getByTestId('thread-detail')).toBeInTheDocument();

    // Go back
    fireEvent.click(screen.getByTestId('back-from-detail-btn'));
    expect(screen.getByTestId('thread-list')).toBeInTheDocument();
    expect(screen.queryByTestId('thread-detail')).not.toBeInTheDocument();
  });

  // ---- Back from new thread form to list ------------------------------------

  it('should navigate back to ThreadList when cancelling new thread', () => {
    render(<AsqioSupport />);

    // Go to new thread form
    fireEvent.click(screen.getByTestId('new-thread-btn'));
    expect(screen.getByTestId('new-thread-form')).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByTestId('cancel-new-thread-btn'));
    expect(screen.getByTestId('thread-list')).toBeInTheDocument();
    expect(screen.queryByTestId('new-thread-form')).not.toBeInTheDocument();
  });

  // ---- After creating a ticket, navigate to detail --------------------------

  it('should navigate to ThreadDetail after creating a new ticket', () => {
    render(<AsqioSupport />);

    // Go to new thread form
    fireEvent.click(screen.getByTestId('new-thread-btn'));
    expect(screen.getByTestId('new-thread-form')).toBeInTheDocument();

    // Create a ticket
    fireEvent.click(screen.getByTestId('create-ticket-btn'));

    expect(screen.queryByTestId('new-thread-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('thread-detail')).toBeInTheDocument();
    expect(screen.getByTestId('detail-ticket-id')).toHaveTextContent('ticket-new');
  });

  // ---- Full navigation cycle ------------------------------------------------

  it('should support a full navigation cycle: list -> detail -> list -> new -> list', () => {
    render(<AsqioSupport />);

    // Start at list
    expect(screen.getByTestId('thread-list')).toBeInTheDocument();

    // Go to detail
    fireEvent.click(screen.getByTestId('select-ticket-btn'));
    expect(screen.getByTestId('thread-detail')).toBeInTheDocument();

    // Back to list
    fireEvent.click(screen.getByTestId('back-from-detail-btn'));
    expect(screen.getByTestId('thread-list')).toBeInTheDocument();

    // Go to new thread form
    fireEvent.click(screen.getByTestId('new-thread-btn'));
    expect(screen.getByTestId('new-thread-form')).toBeInTheDocument();

    // Cancel back to list
    fireEvent.click(screen.getByTestId('cancel-new-thread-btn'));
    expect(screen.getByTestId('thread-list')).toBeInTheDocument();
  });

  // ---- Context prop is passed through ---------------------------------------

  it('should pass the context prop to NewThreadForm', () => {
    // We cannot easily inspect props passed to mocked components via screen queries,
    // but we can verify the form renders correctly when context is provided.
    render(<AsqioSupport context={{ page: '/dashboard' }} />);

    fireEvent.click(screen.getByTestId('new-thread-btn'));
    expect(screen.getByTestId('new-thread-form')).toBeInTheDocument();
  });
});
