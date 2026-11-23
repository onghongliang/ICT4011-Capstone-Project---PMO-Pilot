import { ValidationError } from "./errors.js";
import { getAllowedValues } from "./schemaEnums.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

// Assertions for controllers: each throws a ValidationError (→ 400) with
// the given message when the check fails, so request validation reads as a
// flat list instead of nested if/return blocks.
export function requireUuid(value, message) {
  if (!isUuid(value)) throw new ValidationError(message);
  return value;
}

export function requireString(value, message) {
  if (!isNonEmptyString(value)) throw new ValidationError(message);
  return value;
}

export function requireUuidArray(value, message) {
  if (!Array.isArray(value) || !value.every(isUuid)) throw new ValidationError(message);
  return value;
}

export function requireNonEmptyArray(value, message) {
  if (!Array.isArray(value) || value.length === 0) throw new ValidationError(message);
  return value;
}

export function optionalUuid(value, message) {
  if (value !== null && value !== undefined && !isUuid(value)) throw new ValidationError(message);
  return value ?? null;
}

// Parses a start/end pair, rejecting invalid or inverted ranges.
export function requireTimeRange(startRaw, endRaw) {
  const startTime = new Date(startRaw);
  const endTime = new Date(endRaw);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new ValidationError("start_time and end_time must be valid ISO timestamps");
  }
  if (endTime <= startTime) {
    throw new ValidationError("end_time must be after start_time");
  }
  return { startTime, endTime };
}

// Checks a value against an enum-style CHECK constraint in the schema.
export async function requireAllowed(value, constraintName, field) {
  const allowed = await getAllowedValues(constraintName);
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

export function trimmedOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Builds "col1 = $1, col2 = $2" for only the fields present in `updates`,
// restricted to `allowedColumns` so a PATCH body can never write to an
// arbitrary column. Returns null when there's nothing to update.
export function buildSetClause(updates, allowedColumns, startIndex = 1) {
  const setParts = [];
  const values = [];
  let i = startIndex;
  for (const col of allowedColumns) {
    if (Object.prototype.hasOwnProperty.call(updates, col)) {
      setParts.push(`${col} = $${i}`);
      values.push(updates[col]);
      i += 1;
    }
  }
  return setParts.length === 0 ? null : { clause: setParts.join(", "), values };
}
