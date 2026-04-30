import { randomUUID } from "node:crypto";

import type express from "express";

import { getLogLevel, getNodeEnv, type LogLevel } from "../runtime/profile.js";

type RequestWithId = express.Request & {
  requestId?: string;
};

const logLevelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

function sanitizeFields(fields: Record<string, unknown> | undefined) {
  if (!fields) {
    return {};
  }

  const sanitizedEntries = Object.entries(fields).filter(([key]) => {
    const normalized = key.toLowerCase();
    return !normalized.includes("secret") && !normalized.includes("token") && !normalized.includes("password");
  });

  return Object.fromEntries(sanitizedEntries);
}

function formatDevLog(level: LogLevel, message: string, fields: Record<string, unknown>) {
  const detail = Object.entries(fields)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" ");

  return detail.length > 0 ? `[${level.toUpperCase()}] ${message} ${detail}` : `[${level.toUpperCase()}] ${message}`;
}

export function createLogger(environment: NodeJS.ProcessEnv = process.env): Logger {
  const logLevel = getLogLevel(environment);
  const nodeEnv = getNodeEnv(environment);

  function shouldLog(level: LogLevel) {
    return logLevelRank[level] >= logLevelRank[logLevel];
  }

  function write(level: LogLevel, message: string, fields?: Record<string, unknown>) {
    if (!shouldLog(level)) {
      return;
    }

    const sanitizedFields = sanitizeFields(fields);

    if (nodeEnv === "production") {
      console.log(
        JSON.stringify({
          level,
          message,
          ...sanitizedFields
        })
      );
      return;
    }

    console.log(formatDevLog(level, message, sanitizedFields));
  }

  return {
    debug(message, fields) {
      write("debug", message, fields);
    },
    info(message, fields) {
      write("info", message, fields);
    },
    warn(message, fields) {
      write("warn", message, fields);
    },
    error(message, fields) {
      write("error", message, fields);
    }
  };
}

export function getRequestId(request: express.Request) {
  return (request as RequestWithId).requestId ?? "unknown-request";
}

export function attachRequestId(request: express.Request, response: express.Response, next: express.NextFunction) {
  const requestWithId = request as RequestWithId;
  requestWithId.requestId = request.header("x-request-id")?.trim() || randomUUID();
  response.setHeader("x-request-id", requestWithId.requestId);
  next();
}

export function createRequestLogger(logger: Logger) {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const startedAt = Date.now();

    response.on("finish", () => {
      logger.info("api_request", {
        requestId: getRequestId(request),
        method: request.method,
        route: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt
      });
    });

    next();
  };
}

export function logApiError(
  logger: Logger,
  request: express.Request,
  statusCode: number,
  code: string,
  message: string
) {
  logger.error("api_error", {
    requestId: getRequestId(request),
    method: request.method,
    route: request.originalUrl,
    statusCode,
    code,
    message
  });
}
