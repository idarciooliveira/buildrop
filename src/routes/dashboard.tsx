import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";

import { BrandLogo } from "../components/brand-logo";
import {
	UploadProgressPanel,
	type UploadState,
} from "../components/upload-progress-panel";
import HeaderUser from "../integrations/clerk/header-user";
import {
	beginUpload,
	completeUpload,
	deleteMyApp,
	getMyStorageSummary,
	listMyApps,
} from "../lib/apps";
import { contentTypeForPlatform } from "../lib/platform";
import { getClerkPublishableKey } from "../lib/runtime-env";
import { UploadCancelledError, uploadFile } from "../lib/upload-file";

export const Route = createFileRoute("/dashboard")({
	component: DashboardRoute,
});

type AppRow = Awaited<ReturnType<typeof listMyApps>>[number];
type StorageSummary = Awaited<ReturnType<typeof getMyStorageSummary>>;

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function formatBytes(value: number) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let amount = value;
	let unitIndex = 0;

	while (amount >= 1024 && unitIndex < units.length - 1) {
		amount /= 1024;
		unitIndex++;
	}

	return `${amount.toFixed(unitIndex === 0 || amount >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function appTitle(app: AppRow) {
	return app.metadata.appName ?? app.fileName;
}

function appVersion(app: AppRow) {
	const parts = [app.metadata.version, app.metadata.buildNumber].filter(
		Boolean,
	);
	return parts.length
		? parts.join(" (") + (parts.length > 1 ? ")" : "")
		: "Unknown";
}

function DashboardRoute() {
	if (!getClerkPublishableKey()) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
				<div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
					<h1 className="text-xl font-bold text-slate-950">
						Clerk is not configured
					</h1>
					<p className="mt-3 text-slate-600">
						Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your environment,
						then restart the application.
					</p>
				</div>
			</main>
		);
	}

	return <Dashboard />;
}

function Dashboard() {
	const { isLoaded, isSignedIn } = useAuth();
	const [apps, setApps] = useState<Array<AppRow>>([]);
	const [storage, setStorage] = useState<StorageSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [appToDelete, setAppToDelete] = useState<AppRow | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [uploadState, setUploadState] = useState<UploadState | null>(null);
	const abortUploadRef = useRef<(() => void) | null>(null);
	const [isPending, startTransition] = useTransition();
	const isUploading =
		uploadState !== null &&
		uploadState.phase !== "completed" &&
		uploadState.phase !== "failed";

	function refreshApps() {
		startTransition(async () => {
			try {
				const [nextApps, nextStorage] = await Promise.all([
					listMyApps(),
					getMyStorageSummary(),
				]);
				setApps(nextApps);
				setStorage(nextStorage);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load apps");
			}
		});
	}

	useEffect(() => {
		if (!isLoaded || !isSignedIn) {
			return;
		}

		startTransition(async () => {
			try {
				const [nextApps, nextStorage] = await Promise.all([
					listMyApps(),
					getMyStorageSummary(),
				]);
				setApps(nextApps);
				setStorage(nextStorage);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load apps");
			}
		});
	}, [isLoaded, isSignedIn]);

	useEffect(() => {
		if (uploadState?.phase !== "completed") {
			return;
		}

		const timeout = window.setTimeout(() => setUploadState(null), 4000);
		return () => window.clearTimeout(timeout);
	}, [uploadState?.phase]);

	async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) {
			return;
		}

		setError(null);
		setUploadState({
			fileName: file.name,
			loadedBytes: 0,
			phase: "preparing",
			progress: 0,
			totalBytes: file.size,
			transport: "direct",
		});

		try {
			const upload = await beginUpload({
				data: { fileName: file.name, fileSize: file.size },
			});
			const fallbackQuery = new URLSearchParams({
				fileName: file.name,
				fileSize: file.size.toString(),
				id: upload.id,
				r2Key: upload.r2Key,
			});
			setUploadState({
				fileName: file.name,
				loadedBytes: 0,
				phase: "uploading",
				progress: 0,
				totalBytes: file.size,
				transport: "direct",
			});
			const uploadRequest = uploadFile({
				body: file,
				contentType: contentTypeForPlatform(upload.platform),
				fallbackUrl: `/api/upload?${fallbackQuery}`,
				onFallback: () => {
					setUploadState({
						fileName: file.name,
						loadedBytes: 0,
						phase: "uploading",
						progress: 0,
						totalBytes: file.size,
						transport: "proxy",
					});
				},
				onProgress: (progress) => {
					setUploadState((current) => ({
						fileName: file.name,
						loadedBytes: progress.loadedBytes,
						phase: "uploading",
						progress: progress.percentage,
						totalBytes: progress.totalBytes,
						transport: current?.transport ?? "direct",
					}));
				},
				url: upload.uploadUrl,
			});
			abortUploadRef.current = uploadRequest.abort;
			await uploadRequest.promise;
			abortUploadRef.current = null;

			setUploadState((current) => ({
				fileName: file.name,
				loadedBytes: file.size,
				phase: "processing",
				progress: 100,
				totalBytes: file.size,
				transport: current?.transport ?? "direct",
			}));
			await completeUpload({
				data: {
					fileName: file.name,
					fileSize: file.size,
					id: upload.id,
					r2Key: upload.r2Key,
				},
			});
			refreshApps();
			setUploadState((current) => ({
				fileName: file.name,
				loadedBytes: file.size,
				phase: "completed",
				progress: 100,
				totalBytes: file.size,
				transport: current?.transport ?? "direct",
			}));
		} catch (err) {
			abortUploadRef.current = null;
			const message = err instanceof Error ? err.message : "Upload failed";
			if (!(err instanceof UploadCancelledError)) {
				setError(message);
			}
			setUploadState((current) => ({
				error: message,
				fileName: current?.fileName ?? file.name,
				loadedBytes: current?.loadedBytes ?? 0,
				phase: "failed",
				progress: current?.progress ?? 0,
				totalBytes: current?.totalBytes ?? file.size,
				transport: current?.transport ?? "direct",
			}));
		}
	}

	async function onDelete() {
		if (!appToDelete) return;

		setIsDeleting(true);
		try {
			await deleteMyApp({ data: { id: appToDelete.id } });
			setApps((current) => current.filter((app) => app.id !== appToDelete.id));
			setStorage(await getMyStorageSummary());
			setAppToDelete(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Delete failed");
		} finally {
			setIsDeleting(false);
		}
	}

	async function copyLink(id: string) {
		const url = `${window.location.origin}/d/${id}`;
		await navigator.clipboard.writeText(url);
	}

	if (!isLoaded) {
		return <div className="p-8 text-slate-600">Loading...</div>;
	}

	if (!isSignedIn) {
		return <Navigate to="/sign-in" />;
	}

	return (
		<main className="min-h-screen bg-slate-50">
			<header className="border-b border-slate-200 bg-white">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<BrandLogo markClassName="h-9 w-9" textClassName="text-lg" />
					<HeaderUser />
				</div>
			</header>

			<section className="mx-auto max-w-6xl px-6 py-10">
				<div className="flex flex-col gap-6 rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-300">
							Dashboard
						</p>
						<h1 className="mt-3 text-3xl font-bold">Your app builds</h1>
						<p className="mt-2 max-w-xl text-slate-300">
							Upload an IPA or APK. Metadata is extracted after the file lands
							in R2.
						</p>
					</div>
					<label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200">
						{isUploading ? "Uploading..." : "Upload IPA/APK"}
						<input
							accept=".ipa,.apk"
							className="sr-only"
							disabled={
								isUploading ||
								storage?.remainingBytes === 0 ||
								storage?.hasUnresolvedSizes
							}
							onChange={onUpload}
							type="file"
						/>
					</label>
				</div>

				{storage ? (
					<div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex items-end justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-slate-950">Storage</p>
								<p className="mt-1 text-sm text-slate-500">
									{storage.hasUnresolvedSizes
										? "Calculating existing build sizes"
										: `${formatBytes(storage.usedBytes)} of `}
									{!storage.hasUnresolvedSizes
										? formatBytes(storage.limitBytes)
										: null}{" "}
									{!storage.hasUnresolvedSizes ? "used" : null}
								</p>
							</div>
							<p className="text-sm font-semibold text-slate-700">
								{storage.hasUnresolvedSizes
									? "Uploads temporarily disabled"
									: `${formatBytes(storage.remainingBytes)} remaining`}
							</p>
						</div>
						<div
							aria-label="Storage usage"
							aria-valuemax={storage.limitBytes}
							aria-valuemin={0}
							aria-valuenow={
								storage.hasUnresolvedSizes ? undefined : storage.usedBytes
							}
							className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"
							role="progressbar"
						>
							<div
								className="h-full rounded-full bg-cyan-500"
								style={{
									width: storage.hasUnresolvedSizes
										? "100%"
										: `${Math.min(100, (storage.usedBytes / storage.limitBytes) * 100)}%`,
								}}
							/>
						</div>
					</div>
				) : null}

				{error ? (
					<div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
						{error}
					</div>
				) : null}

				<div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
					{apps.length === 0 ? (
						<div className="p-10 text-center text-slate-500">
							{isPending ? "Loading builds..." : "No builds uploaded yet."}
						</div>
					) : (
						<div className="divide-y divide-slate-200">
							{apps.map((app) => (
								<div
									className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
									key={app.id}
								>
									<div className="flex items-center gap-4">
										{app.metadata.icon ? (
											<img
												alt=""
												className="h-14 w-14 rounded-2xl object-cover shadow-sm"
												src={app.metadata.icon}
											/>
										) : (
											<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-500">
												{app.platform === "ios" ? "iOS" : "APK"}
											</div>
										)}
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<h2 className="font-semibold text-slate-950">
													{appTitle(app)}
												</h2>
												<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
													{app.platform === "ios" ? "iOS" : "Android"}
												</span>
											</div>
											<p className="mt-1 text-sm text-slate-500">
												Version {appVersion(app)} - Uploaded{" "}
												{formatDate(app.createdAt)} -{" "}
												{app.fileSizeBytes === null
													? "Size pending"
													: formatBytes(app.fileSizeBytes)}
											</p>
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
											onClick={() => copyLink(app.id)}
											type="button"
										>
											Copy link
										</button>
										<Link
											className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
											params={{ fileId: app.id }}
											to="/d/$fileId"
										>
											Open
										</Link>
										<button
											className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
											onClick={() => setAppToDelete(app)}
											type="button"
										>
											Delete
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</section>
			{uploadState ? (
				<UploadProgressPanel
					onDismiss={() => setUploadState(null)}
					onStop={() => abortUploadRef.current?.()}
					upload={uploadState}
				/>
			) : null}
			{appToDelete ? (
				<div
					aria-labelledby="delete-dialog-title"
					aria-modal="true"
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
					onKeyDown={(event) => {
						if (event.key === "Escape" && !isDeleting) setAppToDelete(null);
					}}
					onMouseDown={(event) => {
						if (event.target === event.currentTarget && !isDeleting) {
							setAppToDelete(null);
						}
					}}
					role="dialog"
				>
					<div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
						<h2
							className="text-xl font-bold text-slate-950"
							id="delete-dialog-title"
						>
							Delete build?
						</h2>
						<p className="mt-3 text-slate-600">
							Are you sure you want to delete{" "}
							<span className="font-semibold text-slate-900">
								{appTitle(appToDelete)}
							</span>
							? This action cannot be undone.
						</p>
						<div className="mt-6 flex justify-end gap-3">
							<button
								className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isDeleting}
								onClick={() => setAppToDelete(null)}
								type="button"
							>
								Cancel
							</button>
							<button
								className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isDeleting}
								onClick={onDelete}
								type="button"
							>
								{isDeleting ? "Deleting..." : "Delete build"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
