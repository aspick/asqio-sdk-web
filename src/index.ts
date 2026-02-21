// Types
export type {
  Topic,
  Ticket,
  Message,
  TicketWithMessages,
  Device,
  PaginationMeta,
  PaginationParams,
  CreateTicketParams,
  SendMessageParams,
  RegisterDeviceParams,
  UpdateDeviceParams,
  TicketListResponse,
  TopicListResponse,
  MessageListResponse,
  UnreadCountResponse,
  ApiErrorCode,
  ApiErrorResponse,
  AsqioConfig,
} from './types';

// Client
export { AsqioClient } from './client';
export { AsqioError, AsqioNetworkError } from './client';
export { detectDeviceInfo } from './client';
export type { DeviceInfo } from './client';

// Context
export { AsqioProvider, useAsqioClient } from './context';
export type { AsqioProviderProps } from './context';

// Hooks
export {
  useTopics,
  useTickets,
  useTicket,
  useCreateTicket,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useUnreadCount,
} from './hooks';
export type {
  UseTopicsResult,
  UseTicketsResult,
  UseTicketResult,
  UseCreateTicketResult,
  UseMessagesResult,
  UseSendMessageResult,
  UseMarkAsReadResult,
  UseUnreadCountOptions,
  UseUnreadCountResult,
} from './hooks';

// Components
export {
  ThreadList,
  ThreadDetail,
  MessageBubble,
  MessageInput,
  NewThreadForm,
  AsqioSupport,
} from './components';
export type {
  ThreadListProps,
  ThreadDetailProps,
  MessageBubbleProps,
  MessageInputProps,
  NewThreadFormProps,
  AsqioSupportProps,
} from './components';
