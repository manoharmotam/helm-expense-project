// metrics.js
// Drop into the existing backend app directory (alongside index.js).
// Exposes RED metrics (Rate, Errors, Duration) + business metrics
// on GET /metrics in Prometheus text format.
//
// Phase 1: CloudWatch Agent's Prometheus scrape config points here.
// Phase 2: Prometheus scrapes this same endpoint directly. No code change.

const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register }); // process/CPU/memory metrics for free

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const transactionsCreatedTotal = new client.Counter({
  name: "transactions_created_total",
  help: "Total transactions created",
  registers: [register],
});

const transactionsDeletedTotal = new client.Counter({
  name: "transactions_deleted_total",
  help: "Total transactions deleted (single or bulk)",
  registers: [register],
});

// Express middleware: wrap every request with a timer + counters
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    // req.route may be undefined for 404s; fall back to path
    const route = (req.route && req.route.path) || req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}

// Handler for GET /metrics
async function metricsHandler(req, res) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  transactionsCreatedTotal,
  transactionsDeletedTotal,
};
