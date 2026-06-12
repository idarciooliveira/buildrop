import { ClerkProvider } from "@clerk/clerk-react";

import { getClerkPublishableKey } from "../../lib/runtime-env";

export default function AppClerkProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const publishableKey = getClerkPublishableKey();

	if (!publishableKey) {
		throw new Error(
			"Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY.",
		);
	}

	return (
		<ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
			{children}
		</ClerkProvider>
	);
}
