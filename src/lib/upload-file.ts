type UploadFileOptions = {
	body: File;
	contentType: string;
	fallbackUrl?: string;
	onFallback?: () => void;
	onProgress: (progress: UploadProgress) => void;
	url: string;
};

export type UploadProgress = {
	loadedBytes: number;
	percentage: number;
	totalBytes: number;
};

export class UploadCancelledError extends Error {
	constructor() {
		super("Upload was cancelled");
		this.name = "UploadCancelledError";
	}
}

export function uploadFile({
	body,
	contentType,
	fallbackUrl,
	onFallback,
	onProgress,
	url,
}: UploadFileOptions) {
	let activeRequest: XMLHttpRequest | null = null;
	let cancelled = false;
	const promise = new Promise<void>((resolve, reject) => {
		function startRequest(targetUrl: string, canFallback: boolean) {
			const request = new XMLHttpRequest();
			activeRequest = request;
			request.open("PUT", targetUrl);
			request.setRequestHeader("content-type", contentType);

			request.upload.addEventListener("progress", (event) => {
				const loadedBytes = Math.min(event.loaded, body.size);

				onProgress({
					loadedBytes,
					percentage: Math.floor((loadedBytes / body.size) * 100),
					totalBytes: body.size,
				});
			});

			request.addEventListener("load", () => {
				if (request.status >= 200 && request.status < 300) {
					onProgress({
						loadedBytes: body.size,
						percentage: 100,
						totalBytes: body.size,
					});
					resolve();
					return;
				}

				reject(new Error(request.responseText || "Upload to storage failed"));
			});

			request.addEventListener("error", () => {
				if (request !== activeRequest) {
					return;
				}

				if (!cancelled && canFallback && fallbackUrl) {
					onFallback?.();
					startRequest(fallbackUrl, false);
					return;
				}

				reject(
					new Error(
						canFallback
							? "Direct upload was blocked and no fallback is configured"
							: "Upload failed because the storage service could not be reached",
					),
				);
			});

			request.addEventListener("abort", () => {
				reject(new UploadCancelledError());
			});

			request.send(body);
		}

		startRequest(url, true);
	});

	return {
		abort: () => {
			cancelled = true;
			activeRequest?.abort();
		},
		promise,
	};
}
