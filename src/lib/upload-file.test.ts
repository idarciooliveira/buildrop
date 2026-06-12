import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "./upload-file";

class FakeXMLHttpRequest {
	static instances: FakeXMLHttpRequest[] = [];
	static latest: FakeXMLHttpRequest | null = null;

	responseText = "";
	status = 0;
	readonly upload = new EventTarget();
	readonly events = new EventTarget();

	constructor() {
		FakeXMLHttpRequest.latest = this;
		FakeXMLHttpRequest.instances.push(this);
	}

	addEventListener(type: string, listener: EventListener) {
		this.events.addEventListener(type, listener);
	}

	open = vi.fn();
	abort = vi.fn(() => this.emit("abort"));
	send = vi.fn();
	setRequestHeader = vi.fn();

	emit(type: string) {
		this.events.dispatchEvent(new Event(type));
	}
}

function latestRequest() {
	const request = FakeXMLHttpRequest.latest;

	if (!request) {
		throw new Error("Expected an XMLHttpRequest instance");
	}

	return request;
}

describe("uploadFile", () => {
	beforeEach(() => {
		FakeXMLHttpRequest.instances = [];
		FakeXMLHttpRequest.latest = null;
		vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reports progress and resolves after a successful response", async () => {
		const onProgress = vi.fn();
		const file = new File([new Uint8Array(100)], "app.apk");
		const upload = uploadFile({
			body: file,
			contentType: "application/vnd.android.package-archive",
			onProgress,
			url: "https://r2.example/upload",
		});
		const request = latestRequest();

		expect(request.open).toHaveBeenCalledWith(
			"PUT",
			"https://r2.example/upload",
		);
		expect(request.setRequestHeader).toHaveBeenCalledWith(
			"content-type",
			"application/vnd.android.package-archive",
		);

		request.upload.dispatchEvent(
			new ProgressEvent("progress", {
				lengthComputable: true,
				loaded: 99,
				total: 100,
			}),
		);
		expect(onProgress).toHaveBeenLastCalledWith({
			loadedBytes: 99,
			percentage: 99,
			totalBytes: 100,
		});

		request.upload.dispatchEvent(
			new ProgressEvent("progress", {
				lengthComputable: true,
				loaded: 100,
				total: 100,
			}),
		);
		expect(onProgress).toHaveBeenLastCalledWith({
			loadedBytes: 100,
			percentage: 100,
			totalBytes: 100,
		});
		const onResolved = vi.fn();
		upload.promise.then(onResolved);
		await Promise.resolve();
		expect(onResolved).not.toHaveBeenCalled();

		request.status = 200;
		request.emit("load");

		await expect(upload.promise).resolves.toBeUndefined();
		expect(onResolved).toHaveBeenCalledOnce();
		expect(onProgress).toHaveBeenLastCalledWith({
			loadedBytes: 100,
			percentage: 100,
			totalBytes: 100,
		});
	});

	it("rejects with the server response after an unsuccessful response", async () => {
		const upload = uploadFile({
			body: new File(["app"], "app.ipa"),
			contentType: "application/octet-stream",
			onProgress: vi.fn(),
			url: "https://r2.example/upload",
		});
		const request = latestRequest();

		request.status = 500;
		request.responseText = "Storage unavailable";
		request.emit("load");

		await expect(upload.promise).rejects.toThrow("Storage unavailable");
	});

	it("rejects when the network request fails", async () => {
		const upload = uploadFile({
			body: new File(["app"], "app.ipa"),
			contentType: "application/octet-stream",
			onProgress: vi.fn(),
			url: "https://r2.example/upload",
		});

		latestRequest().emit("error");

		await expect(upload.promise).rejects.toThrow(
			"Direct upload was blocked and no fallback is configured",
		);
	});

	it("retries through the fallback after a direct upload network error", async () => {
		const onFallback = vi.fn();
		const onProgress = vi.fn();
		const upload = uploadFile({
			body: new File(["app"], "app.ipa"),
			contentType: "application/octet-stream",
			fallbackUrl: "/api/upload",
			onFallback,
			onProgress,
			url: "https://r2.example/upload",
		});
		const directRequest = latestRequest();

		directRequest.emit("error");

		const fallbackRequest = latestRequest();
		expect(onFallback).toHaveBeenCalledOnce();
		expect(FakeXMLHttpRequest.instances).toHaveLength(2);
		expect(fallbackRequest).not.toBe(directRequest);
		expect(fallbackRequest.open).toHaveBeenCalledWith("PUT", "/api/upload");

		fallbackRequest.status = 200;
		fallbackRequest.emit("load");

		await expect(upload.promise).resolves.toBeUndefined();
		expect(onProgress).toHaveBeenLastCalledWith({
			loadedBytes: 3,
			percentage: 100,
			totalBytes: 3,
		});
	});

	it("reports storage reachability when the fallback also fails", async () => {
		const upload = uploadFile({
			body: new File(["app"], "app.ipa"),
			contentType: "application/octet-stream",
			fallbackUrl: "/api/upload",
			onProgress: vi.fn(),
			url: "https://r2.example/upload",
		});

		latestRequest().emit("error");
		latestRequest().emit("error");

		await expect(upload.promise).rejects.toThrow(
			"storage service could not be reached",
		);
	});

	it("aborts the request and rejects with a cancellation error", async () => {
		const upload = uploadFile({
			body: new File(["app"], "app.ipa"),
			contentType: "application/octet-stream",
			onProgress: vi.fn(),
			url: "https://r2.example/upload",
		});

		upload.abort();

		expect(latestRequest().abort).toHaveBeenCalledOnce();
		await expect(upload.promise).rejects.toMatchObject({
			name: "UploadCancelledError",
		});
	});
});
