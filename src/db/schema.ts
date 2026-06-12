import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type AppMetadata = {
	appName: string | null;
	version: string | null;
	buildNumber: string | null;
	packageName?: string | null;
	bundleId?: string | null;
	versionCode?: string | number | null;
	minSdk?: string | number | null;
	icon?: string | null;
	raw?: unknown;
};

export const apps = pgTable("apps", {
	id: text().primaryKey(),
	userId: text("user_id").notNull(),
	platform: text({ enum: ["ios", "android"] }).notNull(),
	fileName: text("file_name").notNull(),
	r2Key: text("r2_key").notNull(),
	metadata: jsonb().$type<AppMetadata>().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
