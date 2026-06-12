import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadProgressPanel, type UploadState } from "./upload-progress-panel";

function renderPanel(upload: UploadState) {
	return render(
		<UploadProgressPanel
			onDismiss={vi.fn()}
			onStop={vi.fn()}
			upload={upload}
		/>,
	);
}

describe("UploadProgressPanel", () => {
	afterEach(cleanup);

	it("shows the exact uploaded byte progress without manufactured steps", () => {
		const upload: UploadState = {
			fileName: "app.apk",
			loadedBytes: 37,
			phase: "uploading",
			progress: 37,
			totalBytes: 100,
			transport: "direct",
		};
		const { rerender } = renderPanel(upload);

		expect(screen.getByText("37%")).toBeTruthy();
		expect(screen.getByText("37 B of 100 B")).toBeTruthy();
		expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
			"37",
		);

		rerender(
			<UploadProgressPanel
				onDismiss={vi.fn()}
				onStop={vi.fn()}
				upload={{ ...upload, loadedBytes: 81, progress: 81 }}
			/>,
		);

		expect(screen.getByText("81%")).toBeTruthy();
		expect(screen.getByText("81 B of 100 B")).toBeTruthy();

		rerender(
			<UploadProgressPanel
				onDismiss={vi.fn()}
				onStop={vi.fn()}
				upload={{ ...upload, loadedBytes: 100, progress: 100 }}
			/>,
		);

		expect(
			screen.getByText("Waiting for storage confirmation..."),
		).toBeTruthy();
	});

	it("shows processing as indeterminate instead of a percentage", () => {
		renderPanel({
			fileName: "app.ipa",
			loadedBytes: 100,
			phase: "processing",
			progress: 100,
			totalBytes: 100,
			transport: "direct",
		});

		expect(screen.getByText("Finalizing upload...")).toBeTruthy();
		expect(screen.queryByText("100%")).toBeNull();
		expect(
			screen.getByRole("progressbar").getAttribute("aria-valuenow"),
		).toBeNull();
	});

	it("explains when the upload switches to the server fallback", () => {
		renderPanel({
			fileName: "app.apk",
			loadedBytes: 12,
			phase: "uploading",
			progress: 12,
			totalBytes: 100,
			transport: "proxy",
		});

		expect(screen.getByText("Uploading through secure server...")).toBeTruthy();
	});
});
