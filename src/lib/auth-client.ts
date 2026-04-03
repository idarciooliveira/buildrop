import { createAuthClient } from 'better-auth/client';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';

export const authClient = createAuthClient({
	baseURL: import.meta.env.PUBLIC_CONVEX_SITE_URL,
	plugins: [convexClient(), crossDomainClient()],
});
