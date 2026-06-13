import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getDownloadUrl = vi.fn();
const openExternalUrl = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, ...props }: { children?: ReactNode }) => (
		<a {...props}>{children}</a>
	),
	Navigate: () => null,
	createFileRoute: () => () => ({}),
}));

vi.mock("../lib/apps", () => ({
	getDownloadUrl: (...args: Array<unknown>) => getDownloadUrl(...args),
}));

vi.mock("../lib/navigation", () => ({
	openExternalUrl: (...args: Array<unknown>) => openExternalUrl(...args),
}));

vi.mock("../lib/shares", () => ({
	getPublicShare: vi.fn(),
}));

import { SharePageView } from "./share.$shareId";

const share = {
	createdAt: new Date("2026-01-04T10:00:00.000Z"),
	description: "Team release bundle",
	id: "share-123",
	items: [
		{
			appId: "app-ios",
			createdAt: new Date("2026-01-01T10:00:00.000Z"),
			fileName: "Example-iOS.ipa",
			metadata: {
				appName: "Example iOS",
				buildNumber: "77",
				icon: null,
				raw: { releaseNotes: "Fixes and polish" },
				version: "3.4.5",
			},
			platform: "ios",
		},
		{
			appId: "app-android",
			createdAt: new Date("2026-01-02T10:00:00.000Z"),
			fileName: "Example-Android.apk",
			metadata: {
				appName: "Example Android",
				buildNumber: "18",
				icon: null,
				raw: { notes: "Android only notes" },
				version: "7.8.9",
			},
			platform: "android",
		},
	],
	title: "Team release",
} as const;

describe("SharePageView", () => {
	beforeEach(() => {
		getDownloadUrl.mockResolvedValue({
			url: "https://downloads.example/app-android.apk",
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders multiple apps and uses the existing install/download flow", async () => {
		render(<SharePageView share={share} />);

		expect(screen.getByRole("heading", { name: "Team release" })).toBeTruthy();
		expect(screen.getByText("Example iOS")).toBeTruthy();
		expect(screen.getByText("Example Android")).toBeTruthy();
		expect(screen.getByText("Fixes and polish")).toBeTruthy();
		expect(screen.getByText("Android only notes")).toBeTruthy();

		const iosLink = screen.getByRole("link", { name: "Install on iOS" });
		expect(iosLink).toBeTruthy();
		expect(iosLink.getAttribute("href")).toContain("itms-services://");
		expect(decodeURIComponent(iosLink.getAttribute("href") ?? "")).toContain(
			"/api/manifest/app-ios",
		);

		fireEvent.click(screen.getByRole("button", { name: "Download APK" }));

		await waitFor(() => expect(getDownloadUrl).toHaveBeenCalledOnce());
		expect(getDownloadUrl).toHaveBeenCalledWith({
			data: { id: "app-android" },
		});
		expect(openExternalUrl).toHaveBeenCalledWith(
			"https://downloads.example/app-android.apk",
		);
	});

	it("renders an empty state when the shared apps were deleted", () => {
		render(
			<SharePageView
				share={{
					...share,
					items: [],
				}}
			/>,
		);

		expect(
			screen.getByText(
				"This release page is empty. The builds may have been deleted.",
			),
		).toBeTruthy();
	});

	it("is accessible without auth context", () => {
		render(<SharePageView share={share} />);

		expect(screen.getByRole("heading", { name: "Team release" })).toBeTruthy();
	});
});
