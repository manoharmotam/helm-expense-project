// tracing.js
// MUST be required before anything else in index.js (before `express`
// or `mysql2` are required), so auto-instrumentation can hook in:
//
//   require("./tracing");   // <-- first line of index.js
//   const express = require("express");
//   ...
//
// Exports traces via OTLP over HTTP to a local collector on
// localhost:4318. The collector, not this file, decides where traces
// ultimately go — so this file never changes between phase 1 and 2.
//
// Phase 1: collector = ADOT (AWS Distro for OpenTelemetry) -> X-Ray / CloudWatch
// Phase 2: collector = OTel Collector -> Tempo

const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "expense-backend",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  }),
  // auto-instruments http, express, mysql2 out of the box — this is
  // what gives you the nginx -> backend -> mysql span chain for free
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});

module.exports = sdk;
