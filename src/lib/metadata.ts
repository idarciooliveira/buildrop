import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createServerOnlyFn } from "@tanstack/react-start";
import AppInfoParser from "app-info-parser";

import type { AppMetadata } from "../db/schema";
import type { AppPlatform } from "./platform";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asString(value: unknown) {
	if (typeof value === "string" && value.trim()) {
		return value;
	}

	if (typeof value === "number") {
		return value.toString();
	}

	return null;
}

function normalizeIcon(value: unknown) {
	const icon = asString(value);

	if (!icon) {
		return null;
	}

	return icon.startsWith("data:") ? icon : `data:image/png;base64,${icon}`;
}

function normalizeAndroid(result: UnknownRecord): AppMetadata {
	const application = asRecord(result.application);
	const usesSdk = asRecord(result.usesSdk);

	return {
		appName: asString(application.label) ?? asString(result.name),
		buildNumber: asString(result.versionCode),
		icon: normalizeIcon(result.icon),
		minSdk: asString(usesSdk.minSdkVersion),
		packageName: asString(result.package),
		raw: result,
		version: asString(result.versionName),
		versionCode: asString(result.versionCode),
	};
}

function normalizeIos(result: UnknownRecord): AppMetadata {
	return {
		appName:
			asString(result.CFBundleDisplayName) ??
			asString(result.CFBundleName) ??
			asString(result.CFBundleExecutable),
		buildNumber: asString(result.CFBundleVersion),
		bundleId: asString(result.CFBundleIdentifier),
		icon: normalizeIcon(result.icon),
		raw: result,
		version: asString(result.CFBundleShortVersionString),
	};
}

export const extractMetadata = createServerOnlyFn(
	async function extractMetadata({
		bytes,
		fileName,
		platform,
	}: {
		bytes: Buffer;
		fileName: string;
		platform: AppPlatform;
	}): Promise<AppMetadata> {
		const directory = await mkdtemp(join(tmpdir(), "buildrop-"));
		const filePath = join(directory, fileName);

		try {
			await writeFile(filePath, bytes);
			const result = asRecord(await new AppInfoParser(filePath).parse());

			return platform === "android"
				? normalizeAndroid(result)
				: normalizeIos(result);
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	},
);
