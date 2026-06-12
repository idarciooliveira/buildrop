import { createFileRoute } from "@tanstack/react-router";

import { platformFromFileName } from "../lib/platform";

function requiredQueryParam(url: URL, name: string) {
	const value = url.searchParams.get(name)?.trim();

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

export const Route = createFileRoute("/api/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const { requireUserId } = await import("../lib/auth");
					const { putObject } = await import("../lib/r2");
					const url = new URL(request.url);
					const fileName = requiredQueryParam(url, "fileName");
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

					await putObject({
						body: Buffer.from(await request.arrayBuffer()),
						key: r2Key,
						platform,
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
