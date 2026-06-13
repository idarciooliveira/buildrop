export function openExternalUrl(url: string) {
	if (typeof window === "undefined") {
		return;
	}

	window.location.assign(url);
}
