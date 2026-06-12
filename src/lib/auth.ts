import { createClerkClient } from "@clerk/backend";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";

const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey =
	process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerk =
	secretKey && publishableKey
		? createClerkClient({ publishableKey, secretKey })
		: null;

export const requireUserId = createServerOnlyFn(async function requireUserId() {
	if (!clerk) {
		throw new Error(
			"Clerk server authentication is not configured. Set CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY (or VITE_CLERK_PUBLISHABLE_KEY).",
		);
	}

	const request = getRequest();
	const authRequest = new Request(request.url, {
		headers: getRequestHeaders(),
		method: request.method,
	});
	const requestState = await clerk.authenticateRequest(authRequest);

	if (!requestState.isAuthenticated) {
		throw new Error("Unauthorized");
	}

	const auth = requestState.toAuth();

	if (!auth?.userId) {
		throw new Error("Unauthorized");
	}

	return auth.userId;
});
