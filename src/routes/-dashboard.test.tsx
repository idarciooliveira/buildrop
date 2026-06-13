import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listMyApps = vi.fn();
const getMyStorageSummary = vi.fn();
const beginUpload = vi.fn();
const completeUpload = vi.fn();
const deleteMyApp = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...props }: { children?: ReactNode; to?: string }) => (
		<a href={to} {...props}>
			{children ??
				(to === "/dashboard"
					? "Dashboard"
					: to === "/release-pages"
						? "Release pages"
						: to)}
		</a>
	),
	Navigate: () => null,
	createFileRoute: () => () => ({}),
}));

vi.mock("@clerk/clerk-react", () => ({
	SignedIn: ({ children }: { children?: ReactNode }) => <>{children}</>,
	SignedOut: () => null,
	UserButton: () => <div data-testid="user-button" />,
	useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

vi.mock("../lib/runtime-env", () => ({
	getClerkPublishableKey: () => "pk_test_123",
}));

vi.mock("../lib/apps", () => ({
	beginUpload: (...args: Array<unknown>) => beginUpload(...args),
	completeUpload: (...args: Array<unknown>) => completeUpload(...args),
	deleteMyApp: (...args: Array<unknown>) => deleteMyApp(...args),
	getMyStorageSummary: (...args: Array<unknown>) =>
		getMyStorageSummary(...args),
	listMyApps: (...args: Array<unknown>) => listMyApps(...args),
}));

vi.mock("../lib/upload-file", () => ({
	UploadCancelledError: class UploadCancelledError extends Error {},
	uploadFile: vi.fn(),
}));

vi.mock("../components/build-share-dialog", () => ({
	BuildShareDialog: () => null,
}));

vi.mock("../components/upload-progress-panel", () => ({
	UploadProgressPanel: () => null,
}));

import { Dashboard } from "./dashboard";

const apps = [
	{
		createdAt: new Date("2026-01-01T10:00:00.000Z"),
		fileName: "ExampleA.apk",
		fileSizeBytes: 10485760,
		id: "app-a",
		metadata: {
			appName: "Example A",
			buildNumber: "42",
			icon: null,
			version: "1.2.3",
		},
		platform: "android",
		r2Key: "user/app-a/ExampleA.apk",
		userId: "user-123",
	},
] as const;

describe("Dashboard", () => {
	beforeEach(() => {
		listMyApps.mockResolvedValue([...apps]);
		getMyStorageSummary.mockResolvedValue({
			hasUnresolvedSizes: false,
			limitBytes: 1024 * 1024 * 1024,
			remainingBytes: 1024 * 1024 * 1024 - 10485760,
			usedBytes: 10485760,
		});
		beginUpload.mockResolvedValue({
			id: "upload-123",
			platform: "android",
			r2Key: "user/upload-123/ExampleA.apk",
			uploadUrl: "https://upload.example",
		});
		completeUpload.mockResolvedValue(apps[0]);
		deleteMyApp.mockResolvedValue({ ok: true });
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
	});

	it("shows build management and the release pages nav link", async () => {
		render(<Dashboard />);

		expect(await screen.findByText("Example A")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Release pages" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
		await waitFor(() =>
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining("/d/app-a"),
			),
		);
	});
});
