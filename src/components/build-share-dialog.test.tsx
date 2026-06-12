import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BuildShareDialog } from "./build-share-dialog";

describe("BuildShareDialog", () => {
	beforeEach(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
	});

	it("renders the shareable build url and QR code", () => {
		const { container } = render(
			<BuildShareDialog
				fileName="Example.apk"
				onDismiss={vi.fn()}
				platform="android"
				shareUrl="https://buildrop.example/d/abc123"
				title="Example App"
			/>,
		);

		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(
			screen.getByRole("heading", { name: "QR code for Example App" }),
		).toBeTruthy();
		expect(screen.getByText("https://buildrop.example/d/abc123")).toBeTruthy();
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("copies the share link and shows confirmation", async () => {
		render(
			<BuildShareDialog
				fileName="Example.apk"
				onDismiss={vi.fn()}
				platform="android"
				shareUrl="https://buildrop.example/d/abc123"
				title="Example App"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
			"https://buildrop.example/d/abc123",
		);
		expect(
			await screen.findByText("Build link copied to clipboard."),
		).toBeTruthy();
	});

	it("dismisses from the close button", async () => {
		const onDismiss = vi.fn();
		render(
			<BuildShareDialog
				fileName="Example.apk"
				onDismiss={onDismiss}
				platform="android"
				shareUrl="https://buildrop.example/d/abc123"
				title="Example App"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Close share dialog" }));

		expect(onDismiss).toHaveBeenCalledOnce();
	});
});
