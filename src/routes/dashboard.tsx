import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";

import HeaderUser from "../integrations/clerk/header-user";
import {
	completeUpload,
	deleteMyApp,
	getUploadUrl,
	listMyApps,
} from "../lib/apps";
import { contentTypeForPlatform } from "../lib/platform";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type AppRow = Awaited<ReturnType<typeof listMyApps>>[number];

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
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

function Dashboard() {
	const { isLoaded, isSignedIn } = useAuth();
	const [apps, setApps] = useState<Array<AppRow>>([]);
	const [error, setError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isPending, startTransition] = useTransition();

	function refreshApps() {
		startTransition(async () => {
			try {
				setApps(await listMyApps());
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
				setApps(await listMyApps());
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load apps");
			}
		});
	}, [isLoaded, isSignedIn]);

	async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) {
			return;
		}

		setIsUploading(true);
		setError(null);

		try {
			const upload = await getUploadUrl({ data: { fileName: file.name } });
			const response = await fetch(upload.uploadUrl, {
				body: file,
				headers: { "content-type": contentTypeForPlatform(upload.platform) },
				method: "PUT",
			});

			if (!response.ok) {
				throw new Error("Upload to storage failed");
			}

			await completeUpload({
				data: {
					fileName: file.name,
					id: upload.id,
					r2Key: upload.r2Key,
				},
			});
			refreshApps();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setIsUploading(false);
		}
	}

	async function onDelete(id: string) {
		if (!window.confirm("Delete this build?")) {
			return;
		}

		try {
			await deleteMyApp({ data: { id } });
			setApps((current) => current.filter((app) => app.id !== id));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Delete failed");
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
					<Link className="text-lg font-bold" to="/">
						Buildrop
					</Link>
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
							disabled={isUploading}
							onChange={onUpload}
							type="file"
						/>
					</label>
				</div>

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
												{formatDate(app.createdAt)}
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
											onClick={() => onDelete(app.id)}
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
		</main>
	);
}
