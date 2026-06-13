import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { AppShellHeader } from "../components/app-shell-header";
import { ShareEditorDialog } from "../components/share-editor-dialog";
import { deleteMyApp, getMyStorageSummary, listMyApps } from "../lib/apps";
import { getClerkPublishableKey } from "../lib/runtime-env";
import { buildSharePageUrl } from "../lib/share-url";
import { deleteShare, listMyShares, type PublicShare } from "../lib/shares";

export const Route = createFileRoute("/release-pages")({
	component: ReleasePagesRoute,
});

type AppRow = Awaited<ReturnType<typeof listMyApps>>[number];
type ShareRow = Awaited<ReturnType<typeof listMyShares>>[number];
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

function shareTitle(share: ShareRow) {
	return share.title;
}

function ReleasePagesRoute() {
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

	return <ReleasePages />;
}

export function ReleasePages() {
	const { isLoaded, isSignedIn } = useAuth();
	const [apps, setApps] = useState<Array<AppRow>>([]);
	const [shares, setShares] = useState<Array<ShareRow>>([]);
	const [storage, setStorage] = useState<StorageSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copyNotice, setCopyNotice] = useState<string | null>(null);
	const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
	const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
	const [selectedAppIds, setSelectedAppIds] = useState<Array<string>>([]);
	const [shareEditor, setShareEditor] = useState<{
		initialAppIds: Array<string>;
		initialShare: ShareRow | null;
	} | null>(null);
	const [appToDelete, setAppToDelete] = useState<AppRow | null>(null);
	const [shareToDelete, setShareToDelete] = useState<ShareRow | null>(null);
	const [isDeletingApp, setIsDeletingApp] = useState(false);
	const [isDeletingShare, setIsDeletingShare] = useState(false);
	const copyNoticeTimeoutRef = useRef<number | null>(null);
	const [isPending, startTransition] = useTransition();

	const loadReleasePages = useCallback(() => {
		startTransition(async () => {
			try {
				const [nextApps, nextStorage, nextShares] = await Promise.all([
					listMyApps(),
					getMyStorageSummary(),
					listMyShares(),
				]);
				setApps(nextApps);
				setStorage(nextStorage);
				setShares(nextShares);
				setError(null);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load release pages",
				);
			}
		});
	}, []);

	useEffect(() => {
		if (!isLoaded || !isSignedIn) {
			return;
		}

		loadReleasePages();
	}, [isLoaded, isSignedIn, loadReleasePages]);

	useEffect(() => {
		setSelectedAppIds((current) =>
			current.filter((appId) => apps.some((app) => app.id === appId)),
		);
	}, [apps]);

	useEffect(() => {
		return () => {
			if (copyNoticeTimeoutRef.current !== null) {
				window.clearTimeout(copyNoticeTimeoutRef.current);
			}
		};
	}, []);

	async function onDeleteApp() {
		if (!appToDelete) return;

		setIsDeletingApp(true);
		try {
			await deleteMyApp({ data: { id: appToDelete.id } });
			setApps((current) => current.filter((app) => app.id !== appToDelete.id));
			setSelectedAppIds((current) =>
				current.filter((appId) => appId !== appToDelete.id),
			);
			setStorage(await getMyStorageSummary());
			setAppToDelete(null);
			loadReleasePages();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Delete failed");
		} finally {
			setIsDeletingApp(false);
		}
	}

	async function onDeleteShare() {
		if (!shareToDelete) return;

		setIsDeletingShare(true);
		try {
			await deleteShare({ data: { shareId: shareToDelete.id } });
			setShares((current) =>
				current.filter((share) => share.id !== shareToDelete.id),
			);
			setShareToDelete(null);
			setCopyNotice("Release page deleted.");
			if (copyNoticeTimeoutRef.current !== null) {
				window.clearTimeout(copyNoticeTimeoutRef.current);
			}
			copyNoticeTimeoutRef.current = window.setTimeout(() => {
				setCopyNotice(null);
				copyNoticeTimeoutRef.current = null;
			}, 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Delete failed");
		} finally {
			setIsDeletingShare(false);
		}
	}

	async function copyBuildLink(id: string) {
		try {
			const url = new URL(`/d/${id}`, window.location.origin).toString();
			await navigator.clipboard.writeText(url);
			setCopiedAppId(id);
			setCopiedShareId(null);
			setCopyNotice("Build link copied to clipboard.");
			if (copyNoticeTimeoutRef.current !== null) {
				window.clearTimeout(copyNoticeTimeoutRef.current);
			}
			copyNoticeTimeoutRef.current = window.setTimeout(() => {
				setCopyNotice(null);
				setCopiedAppId(null);
				copyNoticeTimeoutRef.current = null;
			}, 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to copy link");
		}
	}

	async function copyShareLink(id: string) {
		try {
			const url = buildSharePageUrl(window.location.origin, id);
			await navigator.clipboard.writeText(url);
			setCopiedShareId(id);
			setCopiedAppId(null);
			setCopyNotice("Release page link copied to clipboard.");
			if (copyNoticeTimeoutRef.current !== null) {
				window.clearTimeout(copyNoticeTimeoutRef.current);
			}
			copyNoticeTimeoutRef.current = window.setTimeout(() => {
				setCopyNotice(null);
				setCopiedShareId(null);
				copyNoticeTimeoutRef.current = null;
			}, 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to copy link");
		}
	}

	function openCreateShareDialog() {
		if (selectedAppIds.length === 0) {
			return;
		}

		setShareEditor({
			initialAppIds: selectedAppIds,
			initialShare: null,
		});
	}

	function openEditShareDialog(share: ShareRow) {
		setShareEditor({
			initialAppIds: share.items.map((item) => item.appId),
			initialShare: share,
		});
	}

	function handleSavedShare(nextShare: PublicShare) {
		setShares((current) => {
			const nextRow = nextShare as ShareRow;
			const exists = current.some((share) => share.id === nextRow.id);

			return exists
				? current.map((share) => (share.id === nextRow.id ? nextRow : share))
				: [nextRow, ...current];
		});
	}

	if (!isLoaded) {
		return <div className="p-8 text-slate-600">Loading...</div>;
	}

	if (!isSignedIn) {
		return <Navigate to="/sign-in" />;
	}

	return (
		<main className="min-h-screen bg-slate-50">
			<AppShellHeader active="release-pages" />

			<section className="mx-auto max-w-6xl px-6 py-10">
				<div className="flex flex-col gap-6 rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-300">
							Release pages
						</p>
						<h1 className="mt-3 text-3xl font-bold">
							Curate one unlisted link
						</h1>
						<p className="mt-2 max-w-xl text-slate-300">
							Select multiple builds, package them into a public release page,
							and share one link with your team.
						</p>
					</div>
					<button
						className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
						disabled={selectedAppIds.length === 0}
						onClick={openCreateShareDialog}
						type="button"
					>
						Create release page
					</button>
				</div>

				<div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex items-end justify-between gap-4">
						<div>
							<p className="text-sm font-semibold text-slate-950">Selected</p>
							<p className="mt-1 text-sm text-slate-500">
								{selectedAppIds.length} build
								{selectedAppIds.length === 1 ? "" : "s"} selected for the next
								release page
							</p>
						</div>
						<button
							className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-40"
							disabled={selectedAppIds.length === 0}
							onClick={() => setSelectedAppIds([])}
							type="button"
						>
							Clear selection
						</button>
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						{selectedAppIds.length === 0 ? (
							<p className="text-sm text-slate-500">
								Use the checkboxes below to pick builds for a release page.
							</p>
						) : (
							selectedAppIds
								.map((appId) => apps.find((app) => app.id === appId))
								.filter((app): app is AppRow => Boolean(app))
								.map((app) => (
									<span
										className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800"
										key={app.id}
									>
										{appTitle(app)}
									</span>
								))
						)}
					</div>
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

				{copyNotice ? (
					<div
						aria-live="polite"
						className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
					>
						{copyNotice}
					</div>
				) : null}

				<div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
					{apps.length === 0 ? (
						<div className="p-10 text-center text-slate-500">
							{isPending ? "Loading builds..." : "No builds uploaded yet."}
						</div>
					) : (
						<div className="divide-y divide-slate-200">
							{apps.map((app) => {
								const selected = selectedAppIds.includes(app.id);

								return (
									<div
										className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
										key={app.id}
									>
										<label className="flex items-start pt-1">
											<input
												aria-label={`Select ${appTitle(app)}`}
												checked={selected}
												className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
												onChange={() => {
													setSelectedAppIds((current) =>
														current.includes(app.id)
															? current.filter((appId) => appId !== app.id)
															: [...current, app.id],
													);
												}}
												type="checkbox"
											/>
										</label>

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
										<div className="flex flex-wrap justify-start gap-2 md:justify-end">
											<button
												className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
												onClick={() => copyBuildLink(app.id)}
												type="button"
											>
												{copiedAppId === app.id ? "Copied" : "Copy link"}
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
								);
							})}
						</div>
					)}
				</div>

				<div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-200 p-6">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-slate-950">
									Release pages
								</p>
								<p className="mt-1 text-sm text-slate-500">
									Unlisted public links curated from multiple builds.
								</p>
							</div>
							<button
								className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
								disabled={selectedAppIds.length === 0}
								onClick={openCreateShareDialog}
								type="button"
							>
								Create release page
							</button>
						</div>
					</div>
					{shares.length === 0 ? (
						<div className="p-10 text-center text-slate-500">
							No release pages yet.
						</div>
					) : (
						<div className="divide-y divide-slate-200">
							{shares.map((share) => (
								<div
									className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
									key={share.id}
								>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<h2 className="truncate font-semibold text-slate-950">
												{shareTitle(share)}
											</h2>
											<span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
												{share.items.length} build
												{share.items.length === 1 ? "" : "s"}
											</span>
										</div>
										<p className="mt-1 line-clamp-2 text-sm text-slate-500">
											{share.description ?? "No description"}
										</p>
										<p className="mt-1 text-sm text-slate-400">
											Created {formatDate(share.createdAt)}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
											onClick={() => copyShareLink(share.id)}
											type="button"
										>
											{copiedShareId === share.id ? "Copied" : "Copy link"}
										</button>
										<Link
											className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
											params={{ shareId: share.id }}
											to="/share/$shareId"
										>
											Open
										</Link>
										<button
											className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
											onClick={() => openEditShareDialog(share)}
											type="button"
										>
											Edit release
										</button>
										<button
											className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
											onClick={() => setShareToDelete(share)}
											type="button"
										>
											Delete release
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</section>

			{shareEditor ? (
				<ShareEditorDialog
					apps={apps}
					initialAppIds={shareEditor.initialAppIds}
					initialShare={shareEditor.initialShare}
					onDismiss={() => {
						if (!shareEditor.initialShare) {
							setSelectedAppIds([]);
						}
						setShareEditor(null);
					}}
					onSaved={handleSavedShare}
				/>
			) : null}

			{appToDelete ? (
				<div
					aria-labelledby="delete-build-dialog-title"
					aria-modal="true"
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
					onKeyDown={(event) => {
						if (event.key === "Escape" && !isDeletingApp) setAppToDelete(null);
					}}
					onMouseDown={(event) => {
						if (event.target === event.currentTarget && !isDeletingApp) {
							setAppToDelete(null);
						}
					}}
					role="dialog"
				>
					<div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
						<h2
							className="text-xl font-bold text-slate-950"
							id="delete-build-dialog-title"
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
								disabled={isDeletingApp}
								onClick={() => setAppToDelete(null)}
								type="button"
							>
								Cancel
							</button>
							<button
								className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isDeletingApp}
								onClick={onDeleteApp}
								type="button"
							>
								{isDeletingApp ? "Deleting..." : "Delete build"}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{shareToDelete ? (
				<div
					aria-labelledby="delete-share-dialog-title"
					aria-modal="true"
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
					onKeyDown={(event) => {
						if (event.key === "Escape" && !isDeletingShare) {
							setShareToDelete(null);
						}
					}}
					onMouseDown={(event) => {
						if (event.target === event.currentTarget && !isDeletingShare) {
							setShareToDelete(null);
						}
					}}
					role="dialog"
				>
					<div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
						<h2
							className="text-xl font-bold text-slate-950"
							id="delete-share-dialog-title"
						>
							Delete release page?
						</h2>
						<p className="mt-3 text-slate-600">
							Are you sure you want to delete{" "}
							<span className="font-semibold text-slate-900">
								{shareTitle(shareToDelete)}
							</span>
							? The public link will stop working.
						</p>
						<div className="mt-6 flex justify-end gap-3">
							<button
								className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isDeletingShare}
								onClick={() => setShareToDelete(null)}
								type="button"
							>
								Cancel
							</button>
							<button
								className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isDeletingShare}
								onClick={onDeleteShare}
								type="button"
							>
								{isDeletingShare ? "Deleting..." : "Delete release page"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
