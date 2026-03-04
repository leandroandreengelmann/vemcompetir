import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.log("No DATABASE_URL found.");
        return;
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260304000000_allow_tenant_profiles_read.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Executing SQL:\n", sql);

        await client.query(sql);
        console.log("Migration applied successfully.");
    } catch (e) {
        console.error("Error applying migration:", e);
    } finally {
        await client.end();
    }
}

run();
