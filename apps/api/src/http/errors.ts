export type ApiErrorCode =
  | "bad_request"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "service_unavailable"
  | "unprocessable_entity"
  | "internal_error";

function inferErrorCode(statusCode: number): ApiErrorCode {
  switch (statusCode) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthenticated";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 413:
      return "payload_too_large";
    case 422:
      return "unprocessable_entity";
    case 503:
      return "service_unavailable";
    default:
      return "internal_error";
  }
}

function extractMessage(body: unknown, statusCode: number) {
  if (typeof body === "string" && body.trim().length > 0) {
    return body;
  }

  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  if (statusCode >= 500) {
    return "The request could not be completed safely.";
  }

  return "Request failed.";
}

export function normalizeErrorBody(body: unknown, statusCode: number, requestId: string) {
  if (statusCode < 400) {
    return body;
  }

  const message = extractMessage(body, statusCode);
  const code = inferErrorCode(statusCode);
  const extras =
    body && typeof body === "object"
      ? Object.fromEntries(
          Object.entries(body).filter(([key]) => key !== "message" && key !== "error")
        )
      : {};

  const existingError =
    body && typeof body === "object" && "error" in body && typeof body.error === "object" && body.error !== null
      ? body.error
      : null;

  return {
    ...extras,
    message,
    error: {
      code: existingError && "code" in existingError && typeof existingError.code === "string"
        ? existingError.code
        : code,
      message,
      requestId
    }
  };
}
