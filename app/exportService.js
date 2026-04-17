const pool = require('./db');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

function getCsvWriter(path, headers) {
  return createObjectCsvWriter({
    path,
    header: headers.map(h => ({ id: h, title: h }))
  });
}

/* ---------------- FULL EXPORT ---------------- */
async function fullExport(consumerId, filename, jobLogger) {
  const usersRes = await pool.query(
    "SELECT * FROM users WHERE is_deleted = false"
  );

  const rows = usersRes.rows;

  const writer = getCsvWriter(
    `output/${filename}`,
    ["id","name","email","created_at","updated_at","is_deleted"]
  );

  await writer.writeRecords(rows);

  const maxUpdatedAt = rows.reduce(
    (max, r) => r.updated_at > max ? r.updated_at : max,
    new Date(0)
  );

  await pool.query(`
    INSERT INTO watermarks(consumer_id,last_exported_at,updated_at)
    VALUES($1,$2,NOW())
    ON CONFLICT (consumer_id)
    DO UPDATE SET last_exported_at=$2, updated_at=NOW()
  `, [consumerId, maxUpdatedAt]);

  jobLogger?.("completed", rows.length);
}

/* ---------------- INCREMENTAL EXPORT ---------------- */
async function incrementalExport(consumerId, lastExportedAt, filename, jobLogger) {
  const res = await pool.query(
    `SELECT * FROM users
     WHERE updated_at > $1
     AND is_deleted = false`,
    [lastExportedAt]
  );

  const rows = res.rows;

  const writer = createObjectCsvWriter({
    path: `output/${filename}`,
    header: [
      { id: "id", title: "id" },
      { id: "name", title: "name" },
      { id: "email", title: "email" },
      { id: "created_at", title: "created_at" },
      { id: "updated_at", title: "updated_at" },
      { id: "is_deleted", title: "is_deleted" }
    ]
  });

  await writer.writeRecords(rows);

  const maxUpdatedAt =
    rows.length > 0
      ? rows.reduce((max, r) => r.updated_at > max ? r.updated_at : max, new Date(0))
      : lastExportedAt;

  await pool.query(
    `UPDATE watermarks
     SET last_exported_at=$2, updated_at=NOW()
     WHERE consumer_id=$1`,
    [consumerId, maxUpdatedAt]
  );

  jobLogger?.("completed", rows.length);
}

/* ---------------- DELTA EXPORT ---------------- */
async function deltaExport(consumerId, lastExportedAt, filename, jobLogger) {
  const res = await pool.query(
    `SELECT *,
      CASE
        WHEN is_deleted = true THEN 'DELETE'
        WHEN created_at = updated_at THEN 'INSERT'
        ELSE 'UPDATE'
      END AS operation
     FROM users
     WHERE updated_at > $1`,
    [lastExportedAt]
  );

  const rows = res.rows;

  const writer = createObjectCsvWriter({
    path: `output/${filename}`,
    header: [
      { id: "operation", title: "operation" },
      { id: "id", title: "id" },
      { id: "name", title: "name" },
      { id: "email", title: "email" },
      { id: "created_at", title: "created_at" },
      { id: "updated_at", title: "updated_at" },
      { id: "is_deleted", title: "is_deleted" }
    ]
  });

  await writer.writeRecords(rows);

  const maxUpdatedAt =
    rows.length > 0
      ? rows.reduce((max, r) => r.updated_at > max ? r.updated_at : max, new Date(0))
      : lastExportedAt;

  await pool.query(
    `UPDATE watermarks
     SET last_exported_at=$2, updated_at=NOW()
     WHERE consumer_id=$1`,
    [consumerId, maxUpdatedAt]
  );

  jobLogger?.("completed", rows.length);
}

module.exports = {
  fullExport,
  incrementalExport,
  deltaExport
};