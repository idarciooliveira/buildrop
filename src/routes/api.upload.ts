import { createFileRoute } from "@tanstack/react-router";

import { contentTypeForPlatform, platformFromFileName } from "../lib/platform";

const MAX_SINGLE_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

function requiredQueryParam(url: URL, name: string) {
	const value = url.searchParams.get(name)?.trim();

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

function requiredFileSize(url: URL) {
	const size = Number(url.searchParams.get("fileSize"));

	if (
		!Number.isSafeInteger(size) ||
		size <= 0 ||
		size > MAX_SINGLE_UPLOAD_BYTES
	) {
		throw new Error("Invalid file size");
	}

	return size;
}

export const Route = createFileRoute("/api/upload")({
	server: {
		handlers: {
			PUT: async ({ request }) => {
				try {
					const { requireUserId } = await import("../lib/auth");
					const { putObjectStream } = await import("../lib/r2");
					const { assertUploadReservation } = await import(
						"../lib/storage-quota"
					);
					const url = new URL(request.url);
					const fileName = requiredQueryParam(url, "fileName");
					const fileSize = requiredFileSize(url);
					const id = requiredQueryParam(url, "id");
					const r2Key = requiredQueryParam(url, "r2Key");
					const platform = platformFromFileName(fileName);
					const userId = await requireUserId();

					if (!platform) {
						return new Response("Only .ipa and .apk files are supported", {
							status: 400,
						});
					}

					if (!r2Key.startsWith(`${userId}/${id}/`)) {
						return new Response("Invalid upload key", { status: 400 });
					}

					if (
						request.headers.get("content-type") !==
						contentTypeForPlatform(platform)
					) {
						return new Response("Invalid content type", { status: 400 });
					}

					if (!request.body) {
						return new Response("Upload body is required", { status: 400 });
					}

					await assertUploadReservation({
						fileSizeBytes: fileSize,
						id,
						userId,
					});

					await putObjectStream({
						body: request.body,
						key: r2Key,
						platform,
						size: fileSize,
					});

					return Response.json({ ok: true });
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Upload failed";

					return new Response(message, {
						status: message === "Unauthorized" ? 401 : 500,
					});
				}
			},
		},
	},
});
