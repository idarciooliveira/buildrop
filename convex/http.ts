import { httpRouter } from 'convex/server';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
	basePath: '/api/auth',
	cors: true,
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:4321'],
});

export default http;
