Import Netlify Forms CSV into MySQL (Laravel)

What this does
- Reads a CSV exported from Netlify Forms and inserts each row into a MySQL table named `contact_messages`.
- The script looks for common CSV columns: name, email, message, and a submitted date. It maps them automatically where possible.

Files
- `import_netlify_csv.js` - Node script to import CSV into MySQL (canonical, clean)
- `package.json` - dependencies: mysql2, csv-parse, dotenv

Setup & Run
1. Export your Netlify form submissions as CSV (Netlify → Sites → <your-site> → Forms → contact → Export CSV).
2. Copy the CSV file to your machine where this script lives or note its path.
3. Create a `.env` file in this folder (or set environment variables) with your DB credentials:

   DB_HOST=your-host
   DB_PORT=3306
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=your-database-name
   DB_SSL=false

   Note: If you're using PlanetScale, follow their docs for TLS/SSL. You may need `DB_SSL=true` and additional cert options; the script uses `rejectUnauthorized: true` when `DB_SSL=true`.

4. Install dependencies:

   cd d:\portfolio\tools\netlify-to-mysql
   npm install

5. Run the importer:

   node import_netlify_csv.js path\to\netlify-export.csv

After running
- The script inserts rows into `contact_messages` table (the table schema expected is the Laravel migration used in this project). If the table doesn't exist, create it first using the migration included in your Laravel app.

Troubleshooting
- Permission/connection errors: verify DB credentials and network access (allow your IP or run script from a machine that can reach the DB).
- Column mapping wrong: open CSV in a text editor and verify column headers; the script prints detected columns and the mapping it will use.
- PlanetScale special notes: PlanetScale requires TLS. If using PlanetScale, use the connection string they provide and set `DB_SSL=true`. See PlanetScale docs for connecting from Node.

If you want, I can also:
- Provide a Laravel `artisan` command instead of Node script.
- Import submissions directly by POSTing them to your Laravel `/api/contact` endpoint (requires the endpoint to be publicly reachable).
