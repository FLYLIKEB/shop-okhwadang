#!/usr/bin/env node
const {
  DEFAULT_ENTRYPOINT,
  assertBuildArtifact,
  formatDiagnostics,
  getDatabaseDiagnostics,
  maskDatabaseUrl,
  verifyDatabaseConnection,
} = require('../dist/config/production-runtime-preflight');

async function run() {
  const entrypoint = process.env.BACKEND_ENTRYPOINT || DEFAULT_ENTRYPOINT;
  const diagnostics = getDatabaseDiagnostics();

  try {
    assertBuildArtifact(entrypoint);
    await verifyDatabaseConnection();
    console.log(`Production preflight passed: entrypoint=${entrypoint} db=${formatDiagnostics(diagnostics)}`);
  } catch (error) {
    console.error(`ERROR: Production preflight failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`DB diagnostics (non-secret): ${formatDiagnostics(diagnostics)}`);
    if (process.env.DATABASE_URL) {
      console.error(`DATABASE_URL target (redacted): ${maskDatabaseUrl(process.env.DATABASE_URL)}`);
    }
    process.exitCode = 1;
  }
}

run();
