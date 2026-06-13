import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/sso-callback")({
	component: SsoCallbackPage,
});

function SsoCallbackPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
			<div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
				<AuthenticateWithRedirectCallback
					routing="path"
					path="/sign-in/sso-callback"
					fallbackRedirectUrl="/dashboard"
				/>
				<p className="mt-6 text-center text-sm text-slate-300">
					Completing sign in...
				</p>
			</div>
		</main>
	);
}
