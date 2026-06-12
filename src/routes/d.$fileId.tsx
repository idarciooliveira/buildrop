import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { BrandLogo } from "../components/brand-logo";
import { getDownloadUrl, getPublicApp } from "../lib/apps";

export const Route = createFileRoute("/d/$fileId")({
	component: DownloadPage,
	loader: ({ params }) => getPublicApp({ data: { id: params.fileId } }),
});

type PublicApp = NonNullable<Awaited<ReturnType<typeof getPublicApp>>>;

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		new Date(value),
	);
}

function titleFor(app: PublicApp) {
	return app.metadata.appName ?? app.fileName;
}

function versionFor(app: PublicApp) {
	const parts = [app.metadata.version, app.metadata.buildNumber].filter(
		Boolean,
	);
	return parts.length ? parts.join(" (") + (parts.length > 1 ? ")" : "") : "";
}

function iosInstallUrl(fileId: string) {
	if (typeof window === "undefined") {
		return "#";
	}

	const manifestUrl = `${window.location.origin}/api/manifest/${fileId}`;
	return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}

function DownloadPage() {
	const app = Route.useLoaderData();
	const { fileId } = Route.useParams();
	const [error, setError] = useState<string | null>(null);
	const [isDownloading, setIsDownloading] = useState(false);

	if (!app) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Build not found</h1>
					<Link className="mt-6 inline-block text-cyan-300" to="/">
						Back to Buildrop
					</Link>
				</div>
			</main>
		);
	}

	async function download() {
		setIsDownloading(true);
		setError(null);

		try {
			const result = await getDownloadUrl({ data: { id: fileId } });
			window.location.href = result.url;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Download failed");
			setIsDownloading(false);
		}
	}

	const version = versionFor(app);

	return (
		<main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
			<div className="mx-auto mb-8 flex max-w-xl justify-center">
				<BrandLogo
					className="text-white"
					markClassName="h-10 w-10"
					textClassName="text-lg"
				/>
			</div>
			<section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
				<div className="flex flex-col items-center text-center">
					{app.metadata.icon ? (
						<img
							alt=""
							className="h-28 w-28 rounded-[1.75rem] object-cover shadow-xl"
							src={app.metadata.icon}
						/>
					) : (
						<div className="flex h-28 w-28 items-center justify-center rounded-[1.75rem] bg-white/10 text-xl font-bold text-cyan-200">
							{app.platform === "ios" ? "iOS" : "APK"}
						</div>
					)}

					<span className="mt-6 rounded-full bg-cyan-300/15 px-3 py-1 text-sm font-semibold text-cyan-200">
						{app.platform === "ios" ? "iOS" : "Android"}
					</span>
					<h1 className="mt-4 text-4xl font-bold tracking-tight">
						{titleFor(app)}
					</h1>
					<p className="mt-3 text-slate-300">
						{version ? `Version ${version}` : "Version unknown"}
					</p>
					<p className="mt-1 text-sm text-slate-400">
						Uploaded {formatDate(app.createdAt)}
					</p>

					<button
						className="mt-8 w-full rounded-2xl bg-cyan-300 px-6 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isDownloading}
						onClick={download}
						type="button"
					>
						{isDownloading ? "Preparing download..." : "Download"}
					</button>

					{app.platform === "ios" ? (
						<a
							className="mt-3 w-full rounded-2xl border border-white/15 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
							href={iosInstallUrl(fileId)}
						>
							Install on iOS
						</a>
					) : null}

					{error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
				</div>
			</section>
		</main>
	);
}
