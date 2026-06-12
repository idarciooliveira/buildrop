export const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

export function canReserveStorage({
	fileSizeBytes,
	limitBytes,
	reservedBytes,
	usedBytes,
}: {
	fileSizeBytes: number;
	limitBytes: number;
	reservedBytes: number;
	usedBytes: number;
}) {
	return usedBytes + reservedBytes + fileSizeBytes <= limitBytes;
}
