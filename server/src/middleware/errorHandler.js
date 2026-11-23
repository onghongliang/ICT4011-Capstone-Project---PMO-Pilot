import { AppError } from "../utils/errors.js";

// Last middleware in the chain: every error thrown by a controller or
// service (Express 5 forwards rejected async handlers here) becomes the
// API's standard JSON error body.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ status: "error", message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ status: "error", message: "request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ status: "error", message: err.message });
}

// Unknown /api routes get a JSON 404 rather than Express's HTML page.
export function notFoundHandler(req, res) {
  res.status(404).json({ status: "error", message: `no route for ${req.method} ${req.path}` });
}
