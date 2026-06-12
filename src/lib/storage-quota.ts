import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "../db";
import { apps, uploadReservations, userStorageLimits } from "../db/schema";
import {
	canReserveStorage,
	DEFAULT_STORAGE_LIMIT_BYTES,
} from "./storage-quota-utils";

export const STORAGE_LIMIT_EXCEEDED_MESSAGE =
	"Storage limit exceeded. Delete builds or contact an administrator.";
export const STORAGE_USAGE_UNRESOLVED_MESSAGE =
	"Storage usage is being calculated. Try uploading again later.";

const RESERVATION_TTL_MS = 60 * 60 * 1000;

type Database = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockUser(database: Database, userId: string) {
	await database.execute(
		sql`select pg_advisory_xact_lock(hashtext(${`storage:${userId}`}))`,
	);
}

async function getUsage(database: Database, userId: string) {
	const [result] = await database
		.select({
			unresolvedCount: sql<number>`count(*) filter (where ${apps.fileSizeBytes} is null)::integer`,
			usedBytes: sql<number>`coalesce(sum(${apps.fileSizeBytes}), 0)::bigint`,
		})
		.from(apps)
		.where(eq(apps.userId, userId));

	return {
		hasUnresolvedSizes: Number(result?.unresolvedCount ?? 0) > 0,
		usedBytes: Number(result?.usedBytes ?? 0),
	};
}

async function getReserved(database: Database, userId: string) {
	const [result] = await database
		.select({
			reservedBytes: sql<number>`coalesce(sum(${uploadReservations.fileSizeBytes}), 0)::bigint`,
		})
		.from(uploadReservations)
		.where(
			and(
				eq(uploadReservations.userId, userId),
				gt(uploadReservations.expiresAt, new Date()),
			),
		);

	return Number(result?.reservedBytes ?? 0);
}

async function getLimit(database: Database, userId: string) {
	const [override] = await database
		.select({ limitBytes: userStorageLimits.limitBytes })
		.from(userStorageLimits)
		.where(eq(userStorageLimits.userId, userId))
		.limit(1);

	return override?.limitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;
}

export async function getUserStorageSummary(userId: string) {
	return db.transaction(async (tx) => {
		const [usage, limitBytes] = await Promise.all([
			getUsage(tx, userId),
			getLimit(tx, userId),
		]);

		return {
			hasUnresolvedSizes: usage.hasUnresolvedSizes,
			limitBytes,
			remainingBytes: usage.hasUnresolvedSizes
				? 0
				: Math.max(0, limitBytes - usage.usedBytes),
			usedBytes: usage.usedBytes,
		};
	});
}

export async function createUploadReservation({
	fileSizeBytes,
	id,
	userId,
}: {
	fileSizeBytes: number;
	id: string;
	userId: string;
}) {
	await db.transaction(async (tx) => {
		await lockUser(tx, userId);
		await tx
			.delete(uploadReservations)
			.where(
				and(
					eq(uploadReservations.userId, userId),
					sql`${uploadReservations.expiresAt} <= now()`,
				),
			);

		const [usage, reservedBytes, limitBytes] = await Promise.all([
			getUsage(tx, userId),
			getReserved(tx, userId),
			getLimit(tx, userId),
		]);

		if (usage.hasUnresolvedSizes) {
			throw new Error(STORAGE_USAGE_UNRESOLVED_MESSAGE);
		}

		if (
			!canReserveStorage({
				fileSizeBytes,
				limitBytes,
				reservedBytes,
				usedBytes: usage.usedBytes,
			})
		) {
			throw new Error(STORAGE_LIMIT_EXCEEDED_MESSAGE);
		}

		await tx.insert(uploadReservations).values({
			expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
			fileSizeBytes,
			id,
			userId,
		});
	});
}

export async function assertUploadReservation({
	fileSizeBytes,
	id,
	userId,
}: {
	fileSizeBytes: number;
	id: string;
	userId: string;
}) {
	const [reservation] = await db
		.select()
		.from(uploadReservations)
		.where(
			and(
				eq(uploadReservations.id, id),
				eq(uploadReservations.userId, userId),
				gt(uploadReservations.expiresAt, new Date()),
			),
		)
		.limit(1);

	if (!reservation || reservation.fileSizeBytes !== fileSizeBytes) {
		throw new Error("Upload reservation is invalid or expired");
	}
}

export async function releaseUploadReservation(id: string, userId: string) {
	await db
		.delete(uploadReservations)
		.where(
			and(eq(uploadReservations.id, id), eq(uploadReservations.userId, userId)),
		);
}

export async function insertAppAndConsumeReservation({
	app,
	fileSizeBytes,
	userId,
}: {
	app: Omit<typeof apps.$inferInsert, "fileSizeBytes" | "userId">;
	fileSizeBytes: number;
	userId: string;
}) {
	return db.transaction(async (tx) => {
		await lockUser(tx, userId);

		const [reservation] = await tx
			.select()
			.from(uploadReservations)
			.where(
				and(
					eq(uploadReservations.id, app.id),
					eq(uploadReservations.userId, userId),
					gt(uploadReservations.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!reservation || reservation.fileSizeBytes !== fileSizeBytes) {
			throw new Error("Upload reservation is invalid or expired");
		}

		const [usage, limitBytes] = await Promise.all([
			getUsage(tx, userId),
			getLimit(tx, userId),
		]);

		if (usage.hasUnresolvedSizes) {
			throw new Error(STORAGE_USAGE_UNRESOLVED_MESSAGE);
		}

		if (usage.usedBytes + fileSizeBytes > limitBytes) {
			throw new Error(STORAGE_LIMIT_EXCEEDED_MESSAGE);
		}

		const [inserted] = await tx
			.insert(apps)
			.values({ ...app, fileSizeBytes, userId })
			.returning();
		await tx
			.delete(uploadReservations)
			.where(eq(uploadReservations.id, app.id));

		return inserted;
	});
}
