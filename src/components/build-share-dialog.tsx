import { Copy, ExternalLink, QrCode, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import QRCode from "react-qr-code";

type BuildShareDialogProps = {
	fileName: string;
	onDismiss: () => void;
	platform: "ios" | "android";
	shareUrl: string;
	title: string;
};

function platformLabel(platform: BuildShareDialogProps["platform"]) {
	return platform === "ios" ? "iOS" : "Android";
}

export function BuildShareDialog({
	fileName,
	onDismiss,
	platform,
	shareUrl,
	title,
}: BuildShareDialogProps) {
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);
	const copyTimeoutRef = useRef<number | null>(null);
	const dialogTitleId = useId();

	useEffect(() => {
		return () => {
			if (copyTimeoutRef.current !== null) {
				window.clearTimeout(copyTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (shareUrl) {
			setCopyState("idle");
			if (copyTimeoutRef.current !== null) {
				window.clearTimeout(copyTimeoutRef.current);
				copyTimeoutRef.current = null;
			}
		}
	}, [shareUrl]);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
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

	return (
		<div
			aria-labelledby={dialogTitleId}
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					onDismiss();
				}
			}}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onDismiss();
				}
			}}
			role="dialog"
		>
			<div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
							<QrCode aria-hidden="true" size={14} />
							Share link
						</p>
						<h2
							className="mt-3 text-2xl font-bold text-slate-950"
							id={dialogTitleId}
						>
							QR code for {title}
						</h2>
						<p className="mt-2 text-sm text-slate-500">
							{fileName} · {platformLabel(platform)} build
						</p>
					</div>
					<button
						aria-label="Close share dialog"
						className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
						onClick={onDismiss}
						type="button"
					>
						<X aria-hidden="true" size={20} />
					</button>
				</div>

				<div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
					<div className="flex justify-center">
						<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
							<QRCode
								bgColor="#FFFFFF"
								fgColor="#0F172A"
								level="M"
								size={220}
								title={`QR code for ${title}`}
								value={shareUrl}
							/>
						</div>
					</div>

					<div>
						<p className="text-sm text-slate-600">
							Scan this QR code to open the public build page on another device.
						</p>

						<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								Share link
							</p>
							<p className="mt-2 break-all text-sm font-medium text-slate-800">
								{shareUrl}
							</p>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							<button
								className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
								onClick={copyLink}
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
						</div>

						<div aria-live="polite" className="mt-3 text-sm">
							{copyState === "copied" ? (
								<p className="font-medium text-emerald-700">
									Build link copied to clipboard.
								</p>
							) : copyState === "error" ? (
								<p className="font-medium text-red-700">
									Unable to copy the link.
								</p>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
