// logger.js
// Structured JSON logs, one line per event, written to a file the
// CloudWatch Agent (phase 1) or Promtail (phase 2) can tail.
// Every request gets a request-id so all log lines for one request
// can be correlated — pair this with the trace-id from tracing.js
// once you get to distributed tracing.

const pino = require("pino");
const { randomUUID } = require("crypto");

const LOG_PATH = process.env.APP_LOG_PATH || "/var/log/expense-backend/app.log";

const logger = pino(
  { level: process.env.LOG_LEVEL || "info" },
  pino.destination(LOG_PATH)
);

// Express middleware: attach a per-request logger with request_id
// and log method/path/status/duration on completion.
function requestLoggerMiddleware(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.log = logger.child({ request_id: requestId });
  req.log.info({ method: req.method, path: req.path }, "request_start");

  const startTime = process.hrtime.bigint();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    req.log.info(
      { method: req.method, path: req.path, status_code: res.statusCode, duration_ms: durationMs },
      "request_end"
    );
  });

  next();
}

module.exports = { logger, requestLoggerMiddleware };
