require('dotenv').config();
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const {
  fullExport,
  incrementalExport,
  deltaExport
} = require('./exportService');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

/* ---------------- LOGGING ---------------- */
function log(event) {
  console.log(JSON.stringify(event));
}

/* ---------------- HEALTH CHECK ---------------- */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

/* ---------------- FULL EXPORT ---------------- */
app.post('/exports/full', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];

  if (!consumerId) {
    return res.status(400).json({ error: "Missing X-Consumer-ID" });
  }

  const jobId = uuidv4();
  const filename = `full_${consumerId}_${Date.now()}.csv`;

  log({
    event: "job_started",
    jobId,
    consumerId,
    exportType: "full"
  });

  setImmediate(async () => {
    try {
      await fullExport(consumerId, filename);

      log({
        event: "job_completed",
        jobId,
        consumerId,
        exportType: "full"
      });
    } catch (err) {
      log({
        event: "job_failed",
        jobId,
        error: err.message
      });
    }
  });

  return res.status(202).json({
    jobId,
    status: "started",
    exportType: "full",
    outputFilename: filename
  });
});

/* ---------------- INCREMENTAL EXPORT ---------------- */
app.post('/exports/incremental', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];

  if (!consumerId) {
    return res.status(400).json({ error: "Missing X-Consumer-ID" });
  }

  const jobId = uuidv4();
  const filename = `incremental_${consumerId}_${Date.now()}.csv`;

  const wm = await pool.query(
    "SELECT last_exported_at FROM watermarks WHERE consumer_id=$1",
    [consumerId]
  );

  const lastExportedAt =
    wm.rows.length > 0 ? wm.rows[0].last_exported_at : new Date(0);

  log({
    event: "job_started",
    jobId,
    consumerId,
    exportType: "incremental"
  });

  setImmediate(async () => {
    try {
      await incrementalExport(consumerId, lastExportedAt, filename);

      log({
        event: "job_completed",
        jobId,
        consumerId,
        exportType: "incremental"
      });
    } catch (err) {
      log({
        event: "job_failed",
        jobId,
        error: err.message
      });
    }
  });

  return res.status(202).json({
    jobId,
    status: "started",
    exportType: "incremental",
    outputFilename: filename
  });
});

/* ---------------- DELTA EXPORT ---------------- */
app.post('/exports/delta', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];

  if (!consumerId) {
    return res.status(400).json({ error: "Missing X-Consumer-ID" });
  }

  const jobId = uuidv4();
  const filename = `delta_${consumerId}_${Date.now()}.csv`;

  const wm = await pool.query(
    "SELECT last_exported_at FROM watermarks WHERE consumer_id=$1",
    [consumerId]
  );

  const lastExportedAt =
    wm.rows.length > 0 ? wm.rows[0].last_exported_at : new Date(0);

  log({
    event: "job_started",
    jobId,
    consumerId,
    exportType: "delta"
  });

  setImmediate(async () => {
    try {
      await deltaExport(consumerId, lastExportedAt, filename);

      log({
        event: "job_completed",
        jobId,
        consumerId,
        exportType: "delta"
      });
    } catch (err) {
      log({
        event: "job_failed",
        jobId,
        error: err.message
      });
    }
  });

  return res.status(202).json({
    jobId,
    status: "started",
    exportType: "delta",
    outputFilename: filename
  });
});

/* ---------------- WATERMARK API ---------------- */
app.get('/exports/watermark', async (req, res) => {
  try {
    const consumerId = req.headers['x-consumer-id'];

    const wm = await pool.query(
      "SELECT * FROM watermarks WHERE consumer_id=$1",
      [consumerId]
    );

    if (!wm.rows || wm.rows.length === 0) {
      return res.status(404).json({
        message: "No watermark found for this consumer"
      });
    }

    return res.json({
      consumerId,
      lastExportedAt: wm.rows[0].last_exported_at
    });

  } catch (err) {
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

/* ---------------- START SERVER ---------------- */
const server = app.listen(8080, () =>
  console.log("Server running on port 8080")
);

module.exports = app;