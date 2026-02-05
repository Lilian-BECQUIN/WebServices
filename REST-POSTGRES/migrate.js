const postgres = require("postgres");
const fs = require("fs");

const sql = postgres({ db: "mydb", user: "user", password: "password", port: 5433 });

async function runMigration() {
    console.log("Reading init_users.sql...");
    const migrationSql = fs.readFileSync("init_users.sql", "utf8");

    console.log("Executing SQL...");
    try {
        await sql.unsafe(migrationSql);
        console.log("Migration successful: users table created.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await sql.end();
    }
}

runMigration();
