import { createAuthClient } from 'better-auth/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

export const authClient = createAuthClient({
	baseURL: '/api/auth',
	plugins: [convexClient()],
});
