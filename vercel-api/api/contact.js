const mysql = require('mysql2/promise');

// Reuse pool across invocations to reduce connection churn.
let pool = null;

function getConfigFromEnv() {
  // Prefer a DATABASE_URL if provided (mysql://user:pass@host:port/db)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        port: url.port ? Number(url.port) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname ? url.pathname.replace(/\//, '') : undefined,
        ssl: { rejectUnauthorized: true }
      };
    } catch (err) {
      // Fall through to individual env vars
      console.warn('Invalid DATABASE_URL, falling back to separate env vars');
    }
  }

  // Fall back to PSCALE_* style vars or generic names
  return {
    host: process.env.PSCALE_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.PSCALE_PORT ? Number(process.env.PSCALE_PORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306),
    user: process.env.PSCALE_USER || process.env.DB_USER || process.env.USER || undefined,
    password: process.env.PSCALE_PASSWORD || process.env.DB_PASSWORD || undefined,
    database: process.env.PSCALE_DATABASE || process.env.DB_NAME || process.env.DATABASE || undefined,
    ssl: { rejectUnauthorized: true }
  };
}

async function getPool() {
  if (pool) return pool;
  const config = getConfigFromEnv();
  if (!config.user || !config.password || !config.host || !config.database) {
    throw new Error('Database configuration is incomplete. Set DATABASE_URL or PSCALE_* / DB_* environment variables.');
  }

  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    ssl: config.ssl
  });

  return pool;
}

module.exports = async function (req, res) {
  // Basic CORS handling for Netlify / static front-ends (adjust as needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  let payload = req.body;
  // If body not parsed (some Vercel setups) try raw parsing
  if (!payload || Object.keys(payload).length === 0) {
    try {
      payload = JSON.parse(req.body || '{}');
    } catch (e) {
      // keep payload as-is
    }
  }

  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim();
  const message = (payload.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'name, email and message are required' });
  }

  if (name.length > 255 || email.length > 255) {
    return res.status(400).json({ success: false, message: 'name or email too long' });
  }

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );

    return res.status(200).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('DB insert error:', err && err.message ? err.message : err);
    // Keep the response generic; frontend will fall back to mailto if network error occurs
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
