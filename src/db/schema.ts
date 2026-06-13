import {
	bigint,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
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

export const appShares = pgTable(
	"app_shares",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		description: text(),
		shareId: text("share_id").primaryKey(),
		title: text().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text("user_id").notNull(),
	},
	(table) => [index("app_shares_user_id_idx").on(table.userId)],
);

export const appShareItems = pgTable(
	"app_share_items",
	{
		appId: text("app_id")
			.notNull()
			.references(() => apps.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		itemOrder: integer("item_order").notNull(),
		shareId: text("share_id")
			.notNull()
			.references(() => appShares.shareId, { onDelete: "cascade" }),
	},
	(table) => [
		index("app_share_items_app_id_idx").on(table.appId),
		index("app_share_items_share_id_idx").on(table.shareId),
		primaryKey({ columns: [table.shareId, table.appId] }),
	],
);

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
