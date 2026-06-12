export type AppPlatform = "ios" | "android";

export function platformFromFileName(fileName: string): AppPlatform | null {
	const normalized = fileName.toLowerCase();

	if (normalized.endsWith(".ipa")) {
		return "ios";
	}

	if (normalized.endsWith(".apk")) {
		return "android";
	}

	return null;
}

export function contentTypeForPlatform(platform: AppPlatform) {
	return platform === "ios"
		? "application/octet-stream"
		: "application/vnd.android.package-archive";
}
