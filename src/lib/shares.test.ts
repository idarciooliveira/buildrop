import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
	db: {},
}));

import type { appShares, apps } from "../db/schema";
import {
	assertShareOwnership,
	mapPublicShare,
	normalizeShareInput,
} from "./shares";

describe("normalizeShareInput", () => {
	it("trims title and filters empty description text", () => {
		expect(
			normalizeShareInput({
				appIds: ["app-a", "app-b", "app-a"],
				description: "  ",
				title: "  Team release  ",
			}),
		).toEqual({
			appIds: ["app-a", "app-b"],
			description: null,
			title: "Team release",
		});
	});

	it("rejects an empty app selection", () => {
		expect(() =>
			normalizeShareInput({
				appIds: [],
				title: "Team release",
			}),
		).toThrow("Select at least one build");
	});
});

describe("assertShareOwnership", () => {
	it("returns apps in the requested order when ownership matches", () => {
		const ownedApps = [{ id: "app-b" }, { id: "app-a" }] as Array<
			typeof apps.$inferSelect
		>;

		expect(
			assertShareOwnership(["app-a", "app-b"], ownedApps).map((app) => app.id),
		).toEqual(["app-a", "app-b"]);
	});

	it("rejects mixed-owner input", () => {
		const ownedApps = [{ id: "app-a" }] as Array<typeof apps.$inferSelect>;

		expect(() => assertShareOwnership(["app-a", "app-b"], ownedApps)).toThrow(
			"One or more selected builds do not belong to your account",
		);
	});
});

describe("mapPublicShare", () => {
	it("keeps the public bundle data and maps app metadata", () => {
		const share = {
			createdAt: new Date("2026-01-01T12:00:00.000Z"),
			description: "Release page",
			shareId: "share-123",
			title: "Team release",
			updatedAt: new Date("2026-01-02T12:00:00.000Z"),
			userId: "user-123",
		} as typeof appShares.$inferSelect;
		const appsInShare = [
			{
				createdAt: new Date("2026-01-03T12:00:00.000Z"),
				fileName: "Example.apk",
				id: "app-1",
				metadata: {
					appName: "Example App",
					buildNumber: "42",
					icon: null,
					version: "1.2.3",
				},
				platform: "android",
				r2Key: "user/app-1/Example.apk",
				userId: "user-123",
			},
		] as Array<typeof apps.$inferSelect>;

		expect(mapPublicShare(share, appsInShare)).toEqual({
			createdAt: share.createdAt,
			description: "Release page",
			id: "share-123",
			items: [
				{
					appId: "app-1",
					createdAt: appsInShare[0].createdAt,
					fileName: "Example.apk",
					metadata: appsInShare[0].metadata,
					platform: "android",
				},
			],
			title: "Team release",
		});
	});
});
