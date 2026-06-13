import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "../db";
import { type AppMetadata, appShareItems, appShares, apps } from "../db/schema";

type OwnedAppRow = typeof apps.$inferSelect;
type ShareRow = typeof appShares.$inferSelect;

export type CreateShareInput = {
	appIds: string[];
	description?: string | null;
	title: string;
};

export type UpdateShareInput = CreateShareInput & {
	shareId: string;
};

export type PublicShareItem = {
	appId: string;
	createdAt: Date;
	fileName: string;
	metadata: AppMetadata;
	platform: OwnedAppRow["platform"];
};

export type PublicShare = {
	createdAt: Date;
	description: string | null;
	id: string;
	items: Array<PublicShareItem>;
	title: string;
};

function requiredString(value: unknown, name: string) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${name} is required`);
	}

	return value.trim();
}

function optionalString(value: unknown) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function requiredAppIds(value: unknown) {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error("Select at least one build");
	}

	const appIds = value.map((entry) => requiredString(entry, "appIds"));
	const uniqueAppIds = Array.from(new Set(appIds));

	if (uniqueAppIds.length === 0) {
		throw new Error("Select at least one build");
	}

	return uniqueAppIds;
}

function normalizeShareInput(value: unknown): CreateShareInput {
	const input = value as {
		appIds?: unknown;
		description?: unknown;
		title?: unknown;
	};

	return {
		appIds: requiredAppIds(input.appIds),
		description: optionalString(input.description),
		title: requiredString(input.title, "title"),
	};
}

function requiredShareId(value: unknown) {
	return requiredString(value, "shareId");
}

function ownedAppsById(appRows: Array<OwnedAppRow>) {
	return new Map(appRows.map((app) => [app.id, app]));
}

function assertShareOwnership(
	requestedAppIds: string[],
	ownedApps: Array<OwnedAppRow>,
) {
	const appMap = ownedAppsById(ownedApps);

	if (appMap.size !== requestedAppIds.length) {
		throw new Error(
			"One or more selected builds do not belong to your account",
		);
	}

	return requestedAppIds.map((appId) => {
		const app = appMap.get(appId);

		if (!app) {
			throw new Error(
				"One or more selected builds do not belong to your account",
			);
		}

		return app;
	});
}

function mapPublicShareItem(app: OwnedAppRow): PublicShareItem {
	return {
		appId: app.id,
		createdAt: app.createdAt,
		fileName: app.fileName,
		metadata: app.metadata,
		platform: app.platform,
	};
}

function mapPublicShare(
	share: ShareRow,
	items: Array<OwnedAppRow>,
): PublicShare {
	return {
		createdAt: share.createdAt,
		description: share.description,
		id: share.shareId,
		items: items.map(mapPublicShareItem),
		title: share.title,
	};
}

async function loadOwnedApps(userId: string, appIds: string[]) {
	const appRows = await db
		.select()
		.from(apps)
		.where(and(eq(apps.userId, userId), inArray(apps.id, appIds)));

	return assertShareOwnership(appIds, appRows);
}

async function loadShareItems(shareId: string) {
	const rows = await db
		.select({ app: apps })
		.from(appShareItems)
		.innerJoin(apps, eq(appShareItems.appId, apps.id))
		.where(eq(appShareItems.shareId, shareId))
		.orderBy(asc(appShareItems.itemOrder));

	return rows.map((row) => row.app);
}

async function loadShareForUser(shareId: string, userId: string) {
	const [share] = await db
		.select()
		.from(appShares)
		.where(and(eq(appShares.shareId, shareId), eq(appShares.userId, userId)))
		.limit(1);

	return share ?? null;
}

export const createShare = createServerFn({ method: "POST" })
	.inputValidator(normalizeShareInput)
	.handler(async ({ data }) => {
		const { requireUserId } = await import("./auth");
		const userId = await requireUserId();
		const shareId = nanoid(10);
		const now = new Date();
		const ownedApps = await loadOwnedApps(userId, data.appIds);

		await db.transaction(async (tx) => {
			await tx.insert(appShares).values({
				createdAt: now,
				description: data.description,
				shareId,
				title: data.title,
				updatedAt: now,
				userId,
			});

			await tx.insert(appShareItems).values(
				ownedApps.map((app, index) => ({
					appId: app.id,
					createdAt: now,
					itemOrder: index,
					shareId,
				})),
			);
		});

		return mapPublicShare(
			{
				createdAt: now,
				description: data.description,
				shareId,
				title: data.title,
				updatedAt: now,
				userId,
			},
			ownedApps,
		);
	});

export const updateShare = createServerFn({ method: "POST" })
	.inputValidator((value) => {
		const input = normalizeShareInput(value);
		const raw = value as { shareId?: unknown };

		return {
			...input,
			shareId: requiredShareId(raw.shareId),
		};
	})
	.handler(async ({ data }) => {
		const { requireUserId } = await import("./auth");
		const userId = await requireUserId();
		const share = await loadShareForUser(data.shareId, userId);

		if (!share) {
			throw new Error("Share not found");
		}

		const ownedApps = await loadOwnedApps(userId, data.appIds);
		const now = new Date();

		await db.transaction(async (tx) => {
			await tx
				.update(appShares)
				.set({
					description: data.description,
					title: data.title,
					updatedAt: now,
				})
				.where(
					and(
						eq(appShares.shareId, data.shareId),
						eq(appShares.userId, userId),
					),
				);

			await tx
				.delete(appShareItems)
				.where(eq(appShareItems.shareId, data.shareId));
			await tx.insert(appShareItems).values(
				ownedApps.map((app, index) => ({
					appId: app.id,
					createdAt: now,
					itemOrder: index,
					shareId: data.shareId,
				})),
			);
		});

		return mapPublicShare(
			{
				...share,
				description: data.description,
				title: data.title,
				updatedAt: now,
			},
			ownedApps,
		);
	});

export const deleteShare = createServerFn({ method: "POST" })
	.inputValidator((value) => {
		const raw = value as { shareId?: unknown };
		return { shareId: requiredShareId(raw.shareId) };
	})
	.handler(async ({ data }) => {
		const { requireUserId } = await import("./auth");
		const userId = await requireUserId();
		const result = await db
			.delete(appShares)
			.where(
				and(eq(appShares.shareId, data.shareId), eq(appShares.userId, userId)),
			)
			.returning({ shareId: appShares.shareId });

		if (result.length === 0) {
			throw new Error("Share not found");
		}

		return { ok: true };
	});

export const listMyShares = createServerFn({ method: "GET" }).handler(
	async () => {
		const { requireUserId } = await import("./auth");
		const userId = await requireUserId();
		const shares = await db
			.select()
			.from(appShares)
			.where(eq(appShares.userId, userId))
			.orderBy(desc(appShares.updatedAt), desc(appShares.createdAt));

		if (shares.length === 0) {
			return [];
		}

		const items = await db
			.select({
				app: apps,
				shareId: appShareItems.shareId,
			})
			.from(appShareItems)
			.innerJoin(apps, eq(appShareItems.appId, apps.id))
			.where(
				inArray(
					appShareItems.shareId,
					shares.map((share) => share.shareId),
				),
			)
			.orderBy(asc(appShareItems.shareId), asc(appShareItems.itemOrder));

		const groupedItems = new Map<string, Array<OwnedAppRow>>();

		for (const row of items) {
			const current = groupedItems.get(row.shareId);

			if (current) {
				current.push(row.app);
			} else {
				groupedItems.set(row.shareId, [row.app]);
			}
		}

		return shares.map((share) =>
			mapPublicShare(share, groupedItems.get(share.shareId) ?? []),
		);
	},
);

export const getPublicShare = createServerFn({ method: "GET" })
	.inputValidator((value) => {
		const raw = value as { shareId?: unknown };
		return { shareId: requiredShareId(raw.shareId) };
	})
	.handler(async ({ data }) => {
		const share = await db
			.select()
			.from(appShares)
			.where(eq(appShares.shareId, data.shareId))
			.limit(1)
			.then((rows) => rows[0] ?? null);

		if (!share) {
			return null;
		}

		const items = await loadShareItems(share.shareId);
		return mapPublicShare(share, items);
	});

export { assertShareOwnership, mapPublicShare, normalizeShareInput };
