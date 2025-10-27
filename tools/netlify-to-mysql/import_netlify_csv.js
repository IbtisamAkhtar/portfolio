#!/usr/bin/env node

// Usage: node import_netlify_csv_clean.js path/to/netlify.csv
// Requires env vars or .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (optional)

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node import_netlify_csv_clean.js <path-to-netlify-csv>');
    process.exit(1);
  }

  const csvPath = path.resolve(argv[0]);
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  console.log(`Parsed ${records.length} rows from CSV`);

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || process.env.USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'database',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  };

  console.log('Connecting to MySQL host', dbConfig.host, 'database', dbConfig.database);

  let pool;
  try {
    pool = await mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 5 });
  } catch (err) {
    console.error('MySQL connection failed:', err.message || err);
    process.exit(1);
  }

  // Determine mapping from CSV columns to our table columns.
  const sample = records[0] || {};
  console.log('Detected CSV columns:', Object.keys(sample).join(', '));

  function findField(row, names) {
    for (const n of names) {
      if (Object.prototype.hasOwnProperty.call(row, n)) return n;
    }
    return null;
  }

  const nameCols = ['name', 'Name', 'full_name', 'your-name'];
  const emailCols = ['email', 'Email', 'your-email'];
  const messageCols = ['message', 'Message', 'your-message', 'comments'];
  const dateCols = ['submitted_at', 'created_at', 'timestamp', 'Date', 'date'];

  const nameCol = findField(sample, nameCols) || Object.keys(sample).find(k => k.toLowerCase().includes('name'));
  const emailCol = findField(sample, emailCols) || Object.keys(sample).find(k => k.toLowerCase().includes('email'));
  const messageCol = findField(sample, messageCols) || Object.keys(sample).find(k => k.toLowerCase().includes('message') || k.toLowerCase().includes('comments'));
  const dateCol = findField(sample, dateCols) || Object.keys(sample).find(k => k.toLowerCase().includes('submitted') || k.toLowerCase().includes('date') || k.toLowerCase().includes('time'));

  console.log('Using mapping -> name:', nameCol, 'email:', emailCol, 'message:', messageCol, 'date:', dateCol);

  const insertSql = `INSERT INTO contact_messages (name, email, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`;

  let inserted = 0;
  for (const row of records) {
    const name = nameCol ? (row[nameCol] || '').trim() : '';
    const email = emailCol ? (row[emailCol] || '').trim() : '';
    const message = messageCol ? (row[messageCol] || '').trim() : '';
    let createdAt = dateCol ? (row[dateCol] || '') : '';

    if (!createdAt) {
      createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else {
      const dt = new Date(createdAt);
      if (!isNaN(dt.getTime())) {
        createdAt = dt.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    try {
      await pool.execute(insertSql, [name, email, message, createdAt, createdAt]);
      inserted++;
    } catch (err) {
      console.error('Insert failed for row:', row, err.message || err);
    }
  }

  console.log(`Imported ${inserted} rows into contact_messages`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
