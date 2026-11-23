// Application errors. Services and controllers throw these; the central
// error handler (middleware/errorHandler.js) turns them into the API's
// standard { status: "error", message } response with the right HTTP code,
// so no layer below the controller needs to know about HTTP responses.
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(400, message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message) {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "you don't have permission to do this") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(409, message);
  }
}

// Turns a PostgreSQL constraint violation into an AppError, using
// `messages` keyed by error code ("23505" unique, "23503" foreign key,
// "23514" check); a value may be a function of the error. Anything else is
// rethrown unchanged.
const STATUS_BY_CODE = { 23505: 409, 23503: 400, 23514: 400 };

export function translateDbError(err, messages) {
  const message = messages[err.code];
  if (!message) throw err;
  throw new AppError(STATUS_BY_CODE[err.code], typeof message === "function" ? message(err) : message);
}
