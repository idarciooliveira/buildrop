import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "../db/index";
import { apps } from "../db/schema";
import { contentTypeForPlatform, platformFromFileName } from "./platform";

const MAX_SINGLE_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

function cleanFileName(fileName: string) {
	return fileName.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180);
}

function requireString(value: unknown, name: string) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${name} is required`);
	}

	return value.trim();
}

function requireFileSize(value: unknown) {
	if (
		typeof value !== "number" ||
		!Number.isSafeInteger(value) ||
		value <= 0 ||
		value > MAX_SINGLE_UPLOAD_BYTES
	) {
		throw new Error("File size must be between 1 byte and 5 GiB");
	}

	return value;
}

export const beginUpload = createServerFn({ method: "POST" })
	.inputValidator((data) => {
		const input = data as { fileName?: unknown; fileSize?: unknown };
		return {
			fileName: requireString(input.fileName, "fileName"),
			fileSize: requireFileSize(input.fileSize),
		};
	})
	.handler(async ({ data }) => {
		const { requireUserId } = await import("./auth");
		const { createUploadUrl } = await import("./r2");
		const { createUploadReservation, releaseUploadReservation } = await import(
			"./storage-quota"
		);
		const userId = await requireUserId();
		const platform = platformFromFileName(data.fileName);

		if (!platform) {
			throw new Error("Only .ipa and .apk files are supported");
		}

		const id = nanoid(8);
		const safeFileName = cleanFileName(data.fileName);
		const r2Key = `${userId}/${id}/${safeFileName}`;
		await createUploadReservation({
			fileSizeBytes: data.fileSize,
			id,
			userId,
		});

		try {
			return {
				id,
				platform,
				r2Key,
				uploadUrl: await createUploadUrl({
					key: r2Key,
					platform,
					size: data.fileSize,
				}),
			};
		} catch (error) {
			await releaseUploadReservation(id, userId);
			throw error;
		}
	});

export const completeUpload = createServerFn({ method: "POST" })
	.inputValidator((data) => {
		const input = data as {
			fileName?: unknown;
			fileSize?: unknown;
			id?: unknown;
			r2Key?: unknown;
		};

		return {
			fileName: requireString(input.fileName, "fileName"),
			fileSize: requireFileSize(input.fileSize),
			id: requireString(input.id, "id"),
			r2Key: requireString(input.r2Key, "r2Key"),
		};
	})
	.handler(async ({ data }) => {
		const { requireUserId } = await import("./auth");
		const { extractMetadata } = await import("./metadata");
		const { getObjectBytes, getObjectInfo } = await import("./r2");
		const { insertAppAndConsumeReservation } = await import("./storage-quota");
		const userId = await requireUserId();
		const platform = platformFromFileName(data.fileName);

		if (!platform) {
			throw new Error("Only .ipa and .apk files are supported");
		}

		if (!data.r2Key.startsWith(`${userId}/${data.id}/`)) {
			throw new Error("Invalid upload key");
		}

		const object = await getObjectInfo(data.r2Key);

		if (object.contentLength !== data.fileSize) {
			throw new Error("Uploaded file size does not match the selected file");
		}

		if (object.contentType !== contentTypeForPlatform(platform)) {
			throw new Error("Uploaded file type does not match the selected file");
		}

		const bytes = await getObjectBytes(data.r2Key);
		const metadata = await extractMetadata({
			bytes,
			fileName: cleanFileName(data.fileName),
			platform,
		});

		const app = await insertAppAndConsumeReservation({
			app: {
				fileName: data.fileName,
				id: data.id,
				metadata,
				platform,
				r2Key: data.r2Key,
			},
			fileSizeBytes: object.contentLength,
			userId,
		});

		return app;
	});

export const getMyStorageSummary = createServerFn({ method: "GET" }).handler(
	async () => {
		const { requireUserId } = await import("./auth");
		const { getUserStorageSummary } = await import("./storage-quota");
		return getUserStorageSummary(await requireUserId());
	},
);

export const listMyApps = createServerFn({ method: "GET" }).handler(
	async () => {
		const { requireUserId } = await import("./auth");
		const userId = await requireUserId();

		return db
			.select()
			.from(apps)
			.where(eq(apps.userId, userId))
			.orderBy(desc(apps.createdAt));
	},
);

export const deleteMyApp = createServerFn({ method: "POST" })
	.inputValidator((data) => {
		const input = data as { id?: unknown };
		return { id: requireString(input.id, "id") };
	})
	.handler(async ({ data }) => {
		const { requireUserId } = await import("./auth");
		const { deleteObject } = await import("./r2");
		const userId = await requireUserId();
		const [app] = await db
			.select()
			.from(apps)
			.where(and(eq(apps.id, data.id), eq(apps.userId, userId)))
			.limit(1);

		if (!app) {
			throw new Error("App not found");
		}

		await deleteObject(app.r2Key);
		await db
			.delete(apps)
			.where(and(eq(apps.id, data.id), eq(apps.userId, userId)));

		return { ok: true };
	});

export const getPublicApp = createServerFn({ method: "GET" })
	.inputValidator((data) => {
		const input = data as { id?: unknown };
		return { id: requireString(input.id, "id") };
	})
	.handler(async ({ data }) => {
		const [app] = await db
			.select()
			.from(apps)
			.where(eq(apps.id, data.id))
			.limit(1);

		return app ?? null;
	});

export const getDownloadUrl = createServerFn({ method: "POST" })
	.inputValidator((data) => {
		const input = data as { id?: unknown };
		return { id: requireString(input.id, "id") };
	})
	.handler(async ({ data }) => {
		const { createDownloadUrl } = await import("./r2");
		const [app] = await db
			.select()
			.from(apps)
			.where(eq(apps.id, data.id))
			.limit(1);

		if (!app) {
			throw new Error("App not found");
		}

		return {
			url: await createDownloadUrl({ fileName: app.fileName, key: app.r2Key }),
		};
	});
