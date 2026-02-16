import type { ApiErrorCode } from '../types';

export class AsqioError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;

  constructor(message: string, code: ApiErrorCode, statusCode: number) {
    super(message);
    this.name = 'AsqioError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AsqioNetworkError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AsqioNetworkError';
    this.cause = cause;
  }
}
