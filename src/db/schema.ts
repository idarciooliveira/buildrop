import {
	bigint,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

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
	fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
	r2Key: text("r2_key").notNull(),
	metadata: jsonb().$type<AppMetadata>().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const userStorageLimits = pgTable("user_storage_limits", {
	userId: text("user_id").primaryKey(),
	limitBytes: bigint("limit_bytes", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const uploadReservations = pgTable(
	"upload_reservations",
	{
		id: text().primaryKey(),
		userId: text("user_id").notNull(),
		fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [index("upload_reservations_user_id_idx").on(table.userId)],
);
