PlanetScale + Vercel contact API

What this is
- A small Vercel serverless function that accepts POST requests from your static site and inserts them into a MySQL-compatible database (PlanetScale works well).
- Files:
  - `api/contact.js` — Vercel serverless function (Node.js, mysql2/promise)
  - `create_table.sql` — SQL to create `contact_messages` table
  - `package.json` — declares `mysql2` dependency

How to deploy (quick)
1. Create a PlanetScale database (or another MySQL host) and obtain a connection string. PlanetScale dashboard -> Connect -> Standard (or Password) -> copy the connection string. It may look like:
   mysql://<username>:<password>@<host>:3306/<database>

2. Run the SQL in `create_table.sql` against the PlanetScale database. You can apply it from the PlanetScale Console (Execute SQL) or using a MySQL client.

3. Deploy to Vercel:
   - Create a new Project in Vercel and link this repository (or create a new project and upload these files).
   - Set environment variables in Vercel (Project Settings -> Environment Variables):
     - Preferred: `DATABASE_URL` = your full mysql://... connection string
     - Or set individually:
       - `PSCALE_HOST`
       - `PSCALE_USER`
       - `PSCALE_PASSWORD`
       - `PSCALE_DATABASE`
   - Vercel will install dependencies from `package.json` automatically.

4. After deploy, note the function URL: `https://<your-deploy>.vercel.app/api/contact` and update your frontend fetch to that URL (or let the placeholder remain while testing).

Env var notes & PlanetScale TLS
- PlanetScale requires TLS. The code sets `ssl: { rejectUnauthorized: true }`. If you encounter TLS issues, check PlanetScale docs for proper connection string and whether you need to use the built-in "Connect with password" section.
- Do NOT commit credentials to git. Use Vercel environment variables.

Testing locally
- To run locally you need Node.js installed. Install dependencies with:

  npm install

- You can test the handler quickly using a tool like `vercel dev` (recommended) or by writing a tiny express wrapper that imports the handler.

Example curl test (after deployment)

  curl -H "Content-Type: application/json" \
    -X POST \
    -d '{"name":"Test","email":"test@example.com","message":"hello"}' \
    https://<your-deploy>.vercel.app/api/contact

If you need me to deploy as well, I can prepare a single-commit branch and instructions — you'll need to create the PlanetScale DB and provide the connection string or set it in your Vercel project. If you want, I can also create a small test script that runs locally (requires Node installed).
