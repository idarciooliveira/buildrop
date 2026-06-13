import {
	ChevronDown,
	ChevronUp,
	Copy,
	ExternalLink,
	QrCode,
	X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";

import type { AppMetadata } from "../db/schema";
import { buildSharePageUrl } from "../lib/share-url";
import {
	type CreateShareInput,
	createShare,
	type PublicShare,
	type UpdateShareInput,
	updateShare,
} from "../lib/shares";

export type ShareEditorApp = {
	createdAt: Date | string;
	fileName: string;
	id: string;
	metadata: AppMetadata;
	platform: "ios" | "android";
};

type ShareEditorDialogProps = {
	apps: Array<ShareEditorApp>;
	initialAppIds?: Array<string>;
	initialShare: PublicShare | null;
	onDismiss: () => void;
	onSaved: (share: PublicShare) => void;
};

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function appTitle(app: ShareEditorApp) {
	return app.metadata.appName ?? app.fileName;
}

function appVersion(app: ShareEditorApp) {
	const parts = [app.metadata.version, app.metadata.buildNumber].filter(
		Boolean,
	);

	return parts.length
		? parts.join(" (") + (parts.length > 1 ? ")" : "")
		: "Unknown";
}

function shareUrlForCurrentOrigin(shareId: string) {
	if (typeof window === "undefined") {
		return "#";
	}

	return buildSharePageUrl(window.location.origin, shareId);
}

export function ShareEditorDialog({
	apps,
	initialAppIds = [],
	initialShare,
	onDismiss,
	onSaved,
}: ShareEditorDialogProps) {
	const [title, setTitle] = useState(initialShare?.title ?? "");
	const [description, setDescription] = useState(
		initialShare?.description ?? "",
	);
	const [selectedAppIds, setSelectedAppIds] = useState<string[]>(
		initialShare?.items.map((item) => item.appId) ?? initialAppIds,
	);
	const [savedShare, setSavedShare] = useState<PublicShare | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);
	const copyTimeoutRef = useRef<number | null>(null);
	const dialogTitleId = useId();

	const appMap = useMemo(
		() => new Map(apps.map((app) => [app.id, app])),
		[apps],
	);

	useEffect(() => {
		setTitle(initialShare?.title ?? "");
		setDescription(initialShare?.description ?? "");
		setSelectedAppIds(
			initialShare?.items.map((item) => item.appId) ?? initialAppIds,
		);
		setSavedShare(null);
		setError(null);
		setCopyState("idle");
	}, [initialAppIds, initialShare]);

	useEffect(() => {
		return () => {
			if (copyTimeoutRef.current !== null) {
				window.clearTimeout(copyTimeoutRef.current);
			}
		};
	}, []);

	function toggleApp(appId: string) {
		setSelectedAppIds((current) =>
			current.includes(appId)
				? current.filter((id) => id !== appId)
				: [...current, appId],
		);
	}

	function moveApp(appId: string, delta: number) {
		setSelectedAppIds((current) => {
			const index = current.indexOf(appId);

			if (index < 0) {
				return current;
			}

			const nextIndex = index + delta;

			if (nextIndex < 0 || nextIndex >= current.length) {
				return current;
			}

			const next = [...current];
			const [item] = next.splice(index, 1);
			next.splice(nextIndex, 0, item);
			return next;
		});
	}

	async function copyLink(shareId: string) {
		try {
			await navigator.clipboard.writeText(shareUrlForCurrentOrigin(shareId));
			setCopyState("copied");
			if (copyTimeoutRef.current !== null) {
				window.clearTimeout(copyTimeoutRef.current);
			}
			copyTimeoutRef.current = window.setTimeout(() => {
				setCopyState("idle");
				copyTimeoutRef.current = null;
			}, 2500);
		} catch {
			setCopyState("error");
		}
	}

	async function handleSave() {
		setIsSaving(true);
		setError(null);

		try {
			const payload: CreateShareInput = {
				appIds: selectedAppIds,
				description,
				title,
			};
			const share = initialShare
				? await updateShare({
						data: {
							...payload,
							shareId: initialShare.id,
						} satisfies UpdateShareInput,
					})
				: await createShare({ data: payload });

			setSavedShare(share);
			onSaved(share);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to save release page",
			);
		} finally {
			setIsSaving(false);
		}
	}

	const selectedApps = selectedAppIds
		.map((appId) => appMap.get(appId))
		.filter(Boolean) as Array<ShareEditorApp>;

	const shareUrl = savedShare ? shareUrlForCurrentOrigin(savedShare.id) : null;

	return (
		<div
			aria-labelledby={dialogTitleId}
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
			onKeyDown={(event) => {
				if (event.key === "Escape" && !isSaving) {
					onDismiss();
				}
			}}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !isSaving) {
					onDismiss();
				}
			}}
			role="dialog"
		>
			<div className="max-h-[min(90vh,56rem)] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
				<div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
					<div>
						<p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
							<QrCode aria-hidden="true" size={14} />
							{initialShare ? "Edit release page" : "Create release page"}
						</p>
						<h2
							className="mt-3 text-2xl font-bold text-slate-950"
							id={dialogTitleId}
						>
							{savedShare ? "Release page ready" : "Curate your bundle"}
						</h2>
						<p className="mt-2 text-sm text-slate-500">
							{savedShare
								? "Share this public link with your team."
								: "Choose one or more builds, then set the page title and optional description."}
						</p>
					</div>
					<button
						aria-label="Close release page dialog"
						className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
						disabled={isSaving}
						onClick={onDismiss}
						type="button"
					>
						<X aria-hidden="true" size={20} />
					</button>
				</div>

				{savedShare && shareUrl ? (
					<div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
						<div className="flex justify-center">
							<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
								<QRCode
									bgColor="#FFFFFF"
									fgColor="#0F172A"
									level="M"
									size={220}
									title={`QR code for ${savedShare.title}`}
									value={shareUrl}
								/>
							</div>
						</div>
						<div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Share link
								</p>
								<p className="mt-2 break-all text-sm font-medium text-slate-800">
									{shareUrl}
								</p>
							</div>
							<p className="mt-4 text-sm text-slate-600">
								{savedShare.items.length} build
								{savedShare.items.length === 1 ? "" : "s"} in this release page
							</p>
							<div className="mt-5 flex flex-wrap gap-3">
								<button
									className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
									onClick={() => copyLink(savedShare.id)}
									type="button"
								>
									<Copy aria-hidden="true" size={16} />
									{copyState === "copied" ? "Copied" : "Copy link"}
								</button>
								<a
									className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
									href={shareUrl}
									rel="noreferrer"
									target="_blank"
								>
									<ExternalLink aria-hidden="true" size={16} />
									Open link
								</a>
								<button
									className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
									onClick={onDismiss}
									type="button"
								>
									Done
								</button>
							</div>
							<div aria-live="polite" className="mt-3 text-sm">
								{copyState === "copied" ? (
									<p className="font-medium text-emerald-700">
										Release page link copied to clipboard.
									</p>
								) : copyState === "error" ? (
									<p className="font-medium text-red-700">
										Unable to copy the link.
									</p>
								) : null}
							</div>
						</div>
					</div>
				) : (
					<div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
						<div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
							<label className="block">
								<span className="text-sm font-semibold text-slate-950">
									Title
								</span>
								<input
									className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
									onChange={(event) => setTitle(event.target.value)}
									placeholder="Team release v1.2.0"
									value={title}
								/>
							</label>

							<label className="mt-4 block">
								<span className="text-sm font-semibold text-slate-950">
									Description
								</span>
								<textarea
									className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
									onChange={(event) => setDescription(event.target.value)}
									placeholder="Optional notes for the team"
									value={description}
								/>
							</label>

							<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-950">
											Selected builds
										</p>
										<p className="text-sm text-slate-500">
											Drag order is represented with move controls.
										</p>
									</div>
									<p className="text-sm font-semibold text-slate-700">
										{selectedApps.length}
									</p>
								</div>

								{selectedApps.length > 0 ? (
									<div className="mt-4 space-y-3">
										{selectedApps.map((app, index) => (
											<div
												className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"
												key={app.id}
											>
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-slate-950">
														{appTitle(app)}
													</p>
													<p className="text-xs text-slate-500">
														{app.platform === "ios" ? "iOS" : "Android"} ·{" "}
														{appVersion(app)}
													</p>
												</div>
												<div className="flex items-center gap-1">
													<button
														aria-label={`Move ${appTitle(app)} up`}
														className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
														disabled={index === 0}
														onClick={() => moveApp(app.id, -1)}
														type="button"
													>
														<ChevronUp aria-hidden="true" size={16} />
													</button>
													<button
														aria-label={`Move ${appTitle(app)} down`}
														className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
														disabled={index === selectedApps.length - 1}
														onClick={() => moveApp(app.id, 1)}
														type="button"
													>
														<ChevronDown aria-hidden="true" size={16} />
													</button>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
										Select at least one build to create the page.
									</div>
								)}
							</div>
						</div>

						<div className="max-h-[min(60vh,42rem)] overflow-y-auto p-6">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-slate-950">
										Available builds
									</p>
									<p className="text-sm text-slate-500">
										Use checkboxes to include or remove builds from the release
										page.
									</p>
								</div>
								<button
									className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
									onClick={() => setSelectedAppIds([])}
									type="button"
								>
									Clear
								</button>
							</div>

							<div className="mt-4 space-y-3">
								{apps.map((app) => {
									const checked = selectedAppIds.includes(app.id);

									return (
										<label
											className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
											key={app.id}
										>
											<input
												checked={checked}
												className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
												onChange={() => toggleApp(app.id)}
												type="checkbox"
											/>
											<div className="flex min-w-0 flex-1 items-center gap-3">
												{app.metadata.icon ? (
													<img
														alt=""
														className="h-12 w-12 rounded-2xl object-cover shadow-sm"
														src={app.metadata.icon}
													/>
												) : (
													<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-500">
														{app.platform === "ios" ? "iOS" : "APK"}
													</div>
												)}
												<div className="min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<p className="truncate font-semibold text-slate-950">
															{appTitle(app)}
														</p>
														<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
															{app.platform === "ios" ? "iOS" : "Android"}
														</span>
													</div>
													<p className="mt-1 text-sm text-slate-500">
														{appVersion(app)} · Uploaded{" "}
														{formatDate(app.createdAt)}
													</p>
												</div>
											</div>
										</label>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{error ? (
					<div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
						{error}
					</div>
				) : null}

				{!savedShare ? (
					<div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
						<button
							className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isSaving}
							onClick={onDismiss}
							type="button"
						>
							Cancel
						</button>
						<button
							className="rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={
								isSaving ||
								title.trim().length === 0 ||
								selectedAppIds.length === 0
							}
							onClick={handleSave}
							type="button"
						>
							{isSaving
								? "Saving..."
								: initialShare
									? "Save changes"
									: "Create release page"}
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}
