import { config } from "dotenv";
import { eq, isNull } from "drizzle-orm";

config({ path: [".env.local", ".env"] });

const { db } = await import("../src/db/index.ts");
const { apps } = await import("../src/db/schema.ts");
const { getObjectInfo } = await import("../src/lib/r2.ts");

const unresolvedApps = await db
	.select({ id: apps.id, r2Key: apps.r2Key })
	.from(apps)
	.where(isNull(apps.fileSizeBytes));

for (const app of unresolvedApps) {
	const object = await getObjectInfo(app.r2Key);

	if (object.contentLength === null) {
		throw new Error(`R2 did not return a size for build ${app.id}`);
	}

	await db
		.update(apps)
		.set({ fileSizeBytes: object.contentLength })
		.where(eq(apps.id, app.id));
	console.log(`Updated ${app.id}: ${object.contentLength} bytes`);
}

console.log(`Backfilled ${unresolvedApps.length} build sizes`);
