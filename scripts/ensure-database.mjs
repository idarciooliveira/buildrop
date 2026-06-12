import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"] });

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not configured");
}

const targetUrl = new URL(process.env.DATABASE_URL);
const databaseName = decodeURIComponent(targetUrl.pathname.slice(1));

if (!databaseName) {
	throw new Error("DATABASE_URL does not include a database name");
}

const maintenanceDatabases = ["postgres", "template1"];
let client;
let lastError;

for (const maintenanceDatabase of maintenanceDatabases) {
	const maintenanceUrl = new URL(targetUrl);
	maintenanceUrl.pathname = `/${maintenanceDatabase}`;
	client = new pg.Client({ connectionString: maintenanceUrl.toString() });

	try {
		await client.connect();
		lastError = undefined;
		break;
	} catch (error) {
		lastError = error;
		await client.end().catch(() => {});
		client = undefined;
	}
}

if (!client) {
	throw lastError;
}

try {
	const result = await client.query(
		"select 1 from pg_database where datname = $1",
		[databaseName],
	);

	if (result.rowCount) {
		console.log(`Database "${databaseName}" already exists`);
	} else {
		const escapedDatabaseName = databaseName.replaceAll('"', '""');
		await client.query(`create database "${escapedDatabaseName}"`);
		console.log(`Created database "${databaseName}"`);
	}
} finally {
	await client.end();
}
