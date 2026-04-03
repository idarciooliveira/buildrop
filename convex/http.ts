import { httpRouter } from 'convex/server';
import { authComponent, authTrustedOrigins, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
	basePath: '/api/auth',
	cors: true,
	trustedOrigins: authTrustedOrigins,
});

export default http;
