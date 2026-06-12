export function buildAppShareUrl(origin: string, fileId: string) {
	return new URL(`/d/${fileId}`, origin).toString();
}
