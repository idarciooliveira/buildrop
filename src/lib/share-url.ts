export function buildAppShareUrl(origin: string, fileId: string) {
	return new URL(`/d/${fileId}`, origin).toString();
}

export function buildSharePageUrl(origin: string, shareId: string) {
	return new URL(`/share/${shareId}`, origin).toString();
}
