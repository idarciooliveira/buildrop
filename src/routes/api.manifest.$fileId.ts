import { createFileRoute } from "@tanstack/react-router";

import { getDownloadUrl, getPublicApp } from "../lib/apps";

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/api/manifest/$fileId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const app = await getPublicApp({ data: { id: params.fileId } });

				if (!app || app.platform !== "ios") {
					return new Response("Not found", { status: 404 });
				}

				const { url } = await getDownloadUrl({ data: { id: params.fileId } });
				const bundleId = app.metadata.bundleId ?? app.id;
				const version =
					app.metadata.version ?? app.metadata.buildNumber ?? "1.0";
				const title = app.metadata.appName ?? app.fileName;
				const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${escapeXml(url)}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${escapeXml(bundleId)}</string>
        <key>bundle-version</key>
        <string>${escapeXml(version)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${escapeXml(title)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

				return new Response(plist, {
					headers: { "content-type": "application/xml; charset=utf-8" },
				});
			},
		},
	},
});
