import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { BrandLogo } from "../components/brand-logo";
import { getDownloadUrl } from "../lib/apps";
import { openExternalUrl } from "../lib/navigation";
import {
	getPublicShare,
	type PublicShare,
	type PublicShareItem,
} from "../lib/shares";

export const Route = createFileRoute("/share/$shareId")({
	component: SharePageRoute,
	loader: ({ params }) => getPublicShare({ data: { shareId: params.shareId } }),
});

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function titleFor(item: PublicShareItem) {
	return item.metadata.appName ?? item.fileName;
}

function versionFor(item: PublicShareItem) {
	const parts = [item.metadata.version, item.metadata.buildNumber].filter(
		Boolean,
	);

	return parts.length
		? parts.join(" (") + (parts.length > 1 ? ")" : "")
		: "Unknown";
}

function notesFor(item: PublicShareItem) {
	const raw = item.metadata.raw;

	if (!raw || typeof raw !== "object") {
		return null;
	}

	const record = raw as Record<string, unknown>;

	for (const key of ["releaseNotes", "notes", "changelog", "whatsNew"]) {
		const value = record[key];

		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}

	return null;
}

function iosInstallUrl(fileId: string) {
	if (typeof window === "undefined") {
		return "#";
	}

	const manifestUrl = `${window.location.origin}/api/manifest/${fileId}`;
	return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}

function SharePageRoute() {
	const share = Route.useLoaderData();

	return <SharePageView share={share} />;
}

export function SharePageView({ share }: { share: PublicShare | null }) {
	const [error, setError] = useState<string | null>(null);
	const [loadingAppId, setLoadingAppId] = useState<string | null>(null);

	if (!share) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Release page not found</h1>
					<Link className="mt-6 inline-block text-cyan-300" to="/">
						Back to Buildrop
					</Link>
				</div>
			</main>
		);
	}

	async function download(item: PublicShareItem) {
		if (item.platform !== "android") {
			return;
		}

		setLoadingAppId(item.appId);
		setError(null);

		try {
			const result = await getDownloadUrl({ data: { id: item.appId } });
			openExternalUrl(result.url);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Download failed");
			setLoadingAppId(null);
		}
	}

	return (
		<main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-cyan-400/10 to-transparent" />
			<div className="relative mx-auto mb-8 flex max-w-5xl justify-center">
				<BrandLogo
					className="text-white"
					markClassName="h-10 w-10"
					textClassName="text-lg"
				/>
			</div>

			<section className="relative mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
				<div className="flex flex-col gap-3 border-b border-white/10 pb-8 text-center">
					<p className="inline-flex self-center rounded-full bg-cyan-300/15 px-3 py-1 text-sm font-semibold text-cyan-200">
						{share.items.length} build{share.items.length === 1 ? "" : "s"}
					</p>
					<h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
						{share.title}
					</h1>
					{share.description ? (
						<p className="mx-auto max-w-2xl text-pretty text-slate-300">
							{share.description}
						</p>
					) : (
						<p className="mx-auto max-w-2xl text-pretty text-slate-400">
							Release page created for a private team bundle.
						</p>
					)}
					<p className="text-sm text-slate-400">
						Created {formatDate(share.createdAt)}
					</p>
				</div>

				{share.items.length === 0 ? (
					<div className="py-12 text-center text-slate-300">
						This release page is empty. The builds may have been deleted.
					</div>
				) : (
					<div className="mt-8 grid gap-4">
						{share.items.map((item) => {
							const version = versionFor(item);
							const notes = notesFor(item);
							const actionLabel =
								item.platform === "ios" ? "Install on iOS" : "Download APK";

							return (
								<div
									className="grid gap-5 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-lg md:grid-cols-[auto_1fr_auto]"
									key={item.appId}
								>
									<div className="flex items-start gap-4">
										{item.metadata.icon ? (
											<img
												alt=""
												className="h-16 w-16 rounded-2xl object-cover shadow-xl"
												src={item.metadata.icon}
											/>
										) : (
											<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-xs font-bold text-cyan-200">
												{item.platform === "ios" ? "iOS" : "APK"}
											</div>
										)}
									</div>

									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<h2 className="text-xl font-semibold text-white">
												{titleFor(item)}
											</h2>
											<span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-xs font-semibold text-cyan-200">
												{item.platform === "ios" ? "iOS" : "Android"}
											</span>
										</div>
										<p className="mt-2 text-sm text-slate-300">
											Version {version}
										</p>
										<p className="mt-1 text-sm text-slate-400">
											Uploaded {formatDate(item.createdAt)}
										</p>
										{notes ? (
											<div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
													Notes
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-200">
													{notes}
												</p>
											</div>
										) : null}
									</div>

									<div className="flex flex-col gap-3 md:items-end">
										{item.platform === "ios" ? (
											<a
												className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
												href={iosInstallUrl(item.appId)}
											>
												{actionLabel}
											</a>
										) : (
											<button
												className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
												disabled={loadingAppId === item.appId}
												onClick={() => download(item)}
												type="button"
											>
												{loadingAppId === item.appId
													? "Preparing download..."
													: actionLabel}
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}

				{error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
			</section>
		</main>
	);
}
