import { createClerkClient } from "@clerk/backend";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const secretKey = process.env.CLERK_SECRET_KEY;

const clerk = secretKey ? createClerkClient({ secretKey }) : null;

export const requireUserId = createServerOnlyFn(async function requireUserId() {
	if (!clerk) {
		throw new Error("CLERK_SECRET_KEY is not configured");
	}

	const requestState = await clerk.authenticateRequest(getRequest());

	if (!requestState.isAuthenticated) {
		throw new Error("Unauthorized");
	}

	const auth = requestState.toAuth();

	if (!auth?.userId) {
		throw new Error("Unauthorized");
	}

	return auth.userId;
});
