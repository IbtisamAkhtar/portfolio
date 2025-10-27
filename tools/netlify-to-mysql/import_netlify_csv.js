#!/usr/bin/env node

// Usage: node import_netlify_csv_clean.js path/to/netlify.csv
// Requires env vars or .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (optional)

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
#!/usr/bin/env node

// import_netlify_csv.js
// Usage:
//   node import_netlify_csv.js [--dry-run] [--limit=N] path/to/netlify.csv
// Examples:
//   node import_netlify_csv.js D:\downloads\netlify.csv
//   node import_netlify_csv.js --dry-run --limit=10 D:\downloads\netlify.csv

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mysql = require('mysql2/promise');
require('dotenv').config();

function parseArgs(argv) {
  const opts = { dryRun: false, limit: null, csvPath: null };
  for (const a of argv) {
    if (a === '--dry-run' || a === '--dryrun') opts.dryRun = true;
    else if (a.startsWith('--limit=')) opts.limit = Number(a.split('=')[1]) || null;
    else if (!a.startsWith('--') && !opts.csvPath) opts.csvPath = a;
  }
  return opts;
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  if (!opts.csvPath) {
    console.error('Usage: node import_netlify_csv.js [--dry-run] [--limit=N] path/to/netlify.csv');
    process.exit(1);
  }

  const csvPath = path.resolve(opts.csvPath);
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  console.log(`Parsed ${records.length} rows from CSV`);

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

  // If dry-run mode, just print a preview and exit
  if (opts.dryRun) {
    const previewCount = opts.limit || Math.min(10, records.length);
    console.log(`DRY RUN: showing first ${previewCount} parsed rows as they would be inserted:`);
    for (let i = 0; i < previewCount; i++) {
      const row = records[i];
      const name = nameCol ? (row[nameCol] || '').trim() : '';
      const email = emailCol ? (row[emailCol] || '').trim() : '';
      const message = messageCol ? (row[messageCol] || '').trim() : '';
      let createdAt = dateCol ? (row[dateCol] || '') : '';
      if (!createdAt) createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      else {
        const dt = new Date(createdAt);
        if (!isNaN(dt.getTime())) createdAt = dt.toISOString().slice(0, 19).replace('T', ' ');
        else createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      console.log(i + 1, { name, email, message, createdAt });
    }
    console.log('DRY RUN complete. No data was written.');
    process.exit(0);
  }

  // Not a dry run: connect to DB and insert
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
  #!/usr/bin/env node

  // import_netlify_csv.js
  // Usage:
  //   node import_netlify_csv.js [--dry-run] [--limit=N] path/to/netlify.csv
  // Examples:
  //   node import_netlify_csv.js D:\downloads\netlify.csv
  //   node import_netlify_csv.js --dry-run --limit=10 D:\downloads\netlify.csv

  const fs = require('fs');
  const path = require('path');
  const { parse } = require('csv-parse/sync');
  const mysql = require('mysql2/promise');
  require('dotenv').config();

  function parseArgs(argv) {
    const opts = { dryRun: false, limit: null, csvPath: null };
    for (const a of argv) {
      if (a === '--dry-run' || a === '--dryrun') opts.dryRun = true;
      else if (a.startsWith('--limit=')) opts.limit = Number(a.split('=')[1]) || null;
      else if (!a.startsWith('--') && !opts.csvPath) opts.csvPath = a;
    }
    return opts;
  }

  async function main() {
    const argv = process.argv.slice(2);
    const opts = parseArgs(argv);
    if (!opts.csvPath) {
      console.error('Usage: node import_netlify_csv.js [--dry-run] [--limit=N] path/to/netlify.csv');
      process.exit(1);
    }

