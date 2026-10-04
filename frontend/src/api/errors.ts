import axios from "axios";
import type { FieldErrors } from "../types/api";

/**
 * The one error type the UI deals with. Every failed API call is converted
 * into this, so pages never have to inspect raw axios errors.
 */
export class ApiError extends Error {
  /** HTTP status; 0 means the server could not be reached. */
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: FieldErrors;

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

interface ErrorBody {
  detail?: unknown;
  code?: unknown;
  errors?: unknown;
}

function flatten(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === "object") return Object.values(value).flatMap(flatten);
  return [String(value)];
}

function defaultMessage(status: number): string {
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  if (status === 404) return "We couldn't find that.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  return "That request didn't work. Please try again.";
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      const message =
        error.code === "ECONNABORTED"
          ? "The server took too long to respond. Please try again."
          : "Can't reach the server. Check your connection and try again.";
      return new ApiError(message, 0);
    }

    const { status, data } = error.response;
    const body: ErrorBody = data && typeof data === "object" ? (data as ErrorBody) : {};

    const fieldErrors: FieldErrors = {};
    if (body.errors && typeof body.errors === "object") {
      for (const [field, messages] of Object.entries(body.errors)) {
        fieldErrors[field] = flatten(messages);
      }
    }

    const message = typeof body.detail === "string" && status < 500 ? body.detail : defaultMessage(status);
    const code = typeof body.code === "string" ? body.code : undefined;
    return new ApiError(message, status, fieldErrors, code);
  }

  return new ApiError(error instanceof Error ? error.message : "Something went wrong.", -1);
}
