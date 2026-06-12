import { CheckCircle2, CircleAlert, LoaderCircle, X } from "lucide-react";

export type UploadPhase =
	| "preparing"
	| "uploading"
	| "processing"
	| "completed"
	| "failed";

export type UploadState = {
	error?: string;
	fileName: string;
	loadedBytes: number;
	phase: UploadPhase;
	progress: number;
	totalBytes: number;
	transport: "direct" | "proxy";
};

type UploadProgressPanelProps = {
	onDismiss: () => void;
	onStop: () => void;
	upload: UploadState;
};

const phaseLabels: Record<UploadPhase, string> = {
	completed: "Upload complete",
	failed: "Upload failed",
	preparing: "Preparing upload...",
	processing: "Finalizing upload...",
	uploading: "Uploading...",
};

function formatBytes(value: number) {
	if (value < 1024) {
		return `${value} B`;
	}

	const units = ["KB", "MB", "GB", "TB"];
	let amount = value;
	let unit = "B";

	for (const nextUnit of units) {
		amount /= 1024;
		unit = nextUnit;

		if (amount < 1024) {
			break;
		}
	}

	return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${unit}`;
}

export function UploadProgressPanel({
	onDismiss,
	onStop,
	upload,
}: UploadProgressPanelProps) {
	const canDismiss = upload.phase === "completed" || upload.phase === "failed";
	const isFailed = upload.phase === "failed";
	const isCompleted = upload.phase === "completed";
	const isDeterminate = upload.phase === "uploading" || isCompleted;
	const displayedProgress = isCompleted ? 100 : upload.progress;
	const statusLabel =
		upload.phase === "uploading" && upload.progress === 100
			? "Waiting for storage confirmation..."
			: upload.phase === "uploading" && upload.transport === "proxy"
				? "Uploading through secure server..."
				: phaseLabels[upload.phase];

	return (
		<aside
			aria-live="polite"
			className="fixed bottom-4 left-4 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-4 sm:w-96"
		>
			<div className="flex items-start gap-3 p-4">
				<div className="mt-0.5 shrink-0">
					{isCompleted ? (
						<CheckCircle2 aria-hidden="true" className="text-emerald-600" />
					) : isFailed ? (
						<CircleAlert aria-hidden="true" className="text-red-600" />
					) : (
						<LoaderCircle
							aria-hidden="true"
							className="animate-spin text-cyan-600"
						/>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="truncate font-semibold text-slate-950">
								{upload.fileName}
							</p>
							<p
								className={`mt-1 text-sm ${isFailed ? "text-red-700" : "text-slate-600"}`}
							>
								{upload.error ?? statusLabel}
							</p>
						</div>
						{canDismiss ? (
							<button
								aria-label="Dismiss upload status"
								className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
								onClick={onDismiss}
								type="button"
							>
								<X aria-hidden="true" size={18} />
							</button>
						) : null}
					</div>

					{isFailed ? null : isDeterminate ? (
						<div className="mt-4 flex items-center gap-3">
							<div
								aria-label="Upload progress"
								aria-valuemax={100}
								aria-valuemin={0}
								aria-valuenow={displayedProgress}
								className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
								role="progressbar"
							>
								<div
									className={`h-full rounded-full ${
										isCompleted ? "bg-emerald-500" : "bg-cyan-500"
									}`}
									style={{ width: `${displayedProgress}%` }}
								/>
							</div>
							<span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">
								{displayedProgress}%
							</span>
						</div>
					) : (
						<div
							aria-label={phaseLabels[upload.phase]}
							className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"
							role="progressbar"
						>
							<div className="h-full w-full animate-pulse rounded-full bg-cyan-500" />
						</div>
					)}
					{upload.phase === "uploading" ? (
						<p className="mt-2 text-xs tabular-nums text-slate-500">
							{formatBytes(upload.loadedBytes)} of{" "}
							{formatBytes(upload.totalBytes)}
						</p>
					) : null}
					{upload.phase === "uploading" ? (
						<div className="mt-4 flex justify-end">
							<button
								className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
								onClick={onStop}
								type="button"
							>
								Stop upload
							</button>
						</div>
					) : null}
				</div>
			</div>
		</aside>
	);
}
