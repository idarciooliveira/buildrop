export function getClerkPublishableKey() {
	if (typeof document !== "undefined") {
		const domKey = document.documentElement.dataset.clerkPublishableKey;
		if (domKey) return domKey;
	}

	const viteKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
	if (viteKey) return viteKey;

	if (typeof process !== "undefined") {
		return (
			process.env.VITE_CLERK_PUBLISHABLE_KEY ??
			process.env.CLERK_PUBLISHABLE_KEY ??
			null
		);
	}

	return null;
}
