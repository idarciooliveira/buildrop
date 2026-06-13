import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listMyApps = vi.fn();
const listMyShares = vi.fn();
const getMyStorageSummary = vi.fn();
const createShare = vi.fn();
const updateShare = vi.fn();
const deleteShare = vi.fn();
const deleteMyApp = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, ...props }: { children?: ReactNode; to?: string }) => (
		<a href={to} {...props}>
			{children ??
				(to === "/dashboard"
					? "Dashboard"
					: to === "/release-pages"
						? "Release pages"
						: to === "/share/$shareId"
							? "Open"
							: to === "/d/$fileId"
								? "Open"
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
	deleteMyApp: (...args: Array<unknown>) => deleteMyApp(...args),
	getMyStorageSummary: (...args: Array<unknown>) =>
		getMyStorageSummary(...args),
	listMyApps: (...args: Array<unknown>) => listMyApps(...args),
}));

vi.mock("../lib/shares", () => ({
	createShare: (...args: Array<unknown>) => createShare(...args),
	deleteShare: (...args: Array<unknown>) => deleteShare(...args),
	listMyShares: (...args: Array<unknown>) => listMyShares(...args),
	updateShare: (...args: Array<unknown>) => updateShare(...args),
}));

import { ReleasePages } from "./release-pages";

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
	{
		createdAt: new Date("2026-01-02T10:00:00.000Z"),
		fileName: "ExampleB.ipa",
		fileSizeBytes: 20485760,
		id: "app-b",
		metadata: {
			appName: "Example B",
			buildNumber: "7",
			icon: null,
			version: "2.0.0",
		},
		platform: "ios",
		r2Key: "user/app-b/ExampleB.ipa",
		userId: "user-123",
	},
] as const;

const existingShare = {
	createdAt: new Date("2026-01-04T10:00:00.000Z"),
	description: "Current release page",
	id: "share-123",
	items: [
		{
			appId: "app-a",
			createdAt: apps[0].createdAt,
			fileName: apps[0].fileName,
			metadata: apps[0].metadata,
			platform: apps[0].platform,
		},
	],
	title: "Team release",
} as const;

describe("ReleasePages", () => {
	beforeEach(() => {
		listMyApps.mockResolvedValue([...apps]);
		listMyShares.mockResolvedValue([existingShare]);
		getMyStorageSummary.mockResolvedValue({
			hasUnresolvedSizes: false,
			limitBytes: 1024 * 1024 * 1024,
			remainingBytes: 1024 * 1024 * 1024 - 30720000,
			usedBytes: 30720000,
		});
		createShare.mockResolvedValue({
			createdAt: new Date("2026-01-05T10:00:00.000Z"),
			description: "Bundle for QA",
			id: "share-456",
			items: [
				{
					appId: "app-a",
					createdAt: apps[0].createdAt,
					fileName: apps[0].fileName,
					metadata: apps[0].metadata,
					platform: apps[0].platform,
				},
				{
					appId: "app-b",
					createdAt: apps[1].createdAt,
					fileName: apps[1].fileName,
					metadata: apps[1].metadata,
					platform: apps[1].platform,
				},
			],
			title: "QA release",
		});
		updateShare.mockResolvedValue({
			...existingShare,
			description: "Updated release",
			title: "Updated team release",
		});
		deleteShare.mockResolvedValue({ ok: true });
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

	it("opens the create flow from multi-select and shows the share link", async () => {
		const { container } = render(<ReleasePages />);

		expect(await screen.findByText("Example A")).toBeTruthy();

		fireEvent.click(screen.getByLabelText("Select Example A"));
		fireEvent.click(screen.getByLabelText("Select Example B"));
		fireEvent.click(
			screen.getAllByRole("button", { name: "Create release page" })[0],
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Title"), {
			target: { value: "QA release" },
		});
		fireEvent.change(screen.getByLabelText("Description"), {
			target: { value: "Bundle for QA" },
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Create release page" }),
		);

		await waitFor(() => expect(createShare).toHaveBeenCalledOnce());
		expect(createShare).toHaveBeenCalledWith({
			data: {
				appIds: ["app-a", "app-b"],
				description: "Bundle for QA",
				title: "QA release",
			},
		});

		expect(screen.getByText("Release page ready")).toBeTruthy();
		expect(screen.getByText(/\/share\/share-456/)).toBeTruthy();
		expect(container.querySelector("svg")).toBeTruthy();

		fireEvent.click(within(dialog).getByRole("button", { name: "Copy link" }));
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
			expect.stringContaining("/share/share-456"),
		);
	});

	it("edits and deletes an existing release page from the list", async () => {
		render(<ReleasePages />);

		expect(await screen.findByText("Team release")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Edit release" }));
		fireEvent.change(screen.getByLabelText("Title"), {
			target: { value: "Updated team release" },
		});
		fireEvent.change(screen.getByLabelText("Description"), {
			target: { value: "Updated release" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(updateShare).toHaveBeenCalledOnce());
		expect(updateShare).toHaveBeenCalledWith({
			data: {
				appIds: ["app-a"],
				description: "Updated release",
				shareId: "share-123",
				title: "Updated team release",
			},
		});
		expect(screen.getByText("Release page ready")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Done" }));
		expect(screen.getByText("Updated team release")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Delete release" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Delete release page" }),
		);

		await waitFor(() => expect(deleteShare).toHaveBeenCalledOnce());
		expect(deleteShare).toHaveBeenCalledWith({
			data: { shareId: "share-123" },
		});
		await waitFor(() =>
			expect(screen.queryByText("Updated team release")).toBeNull(),
		);
	});
});
