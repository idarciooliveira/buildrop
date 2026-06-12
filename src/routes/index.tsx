import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="min-h-screen bg-slate-950 text-white">
			<section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
				<div className="max-w-3xl">
					<p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">
						Build drops for iOS and Android testers
					</p>
					<h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl">
						Upload IPA and APK files. Share one clean install link.
					</h1>
					<p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
						Buildrop extracts app metadata, stores builds in Cloudflare R2, and
						gives every upload a short public download page.
					</p>
					<div className="mt-10 flex flex-wrap gap-3">
						<SignedIn>
							<Link
								className="rounded-full bg-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
								to="/dashboard"
							>
								Open dashboard
							</Link>
						</SignedIn>
						<SignedOut>
							<SignInButton mode="modal">
								<button
									className="rounded-full bg-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
									type="button"
								>
									Sign in to upload
								</button>
							</SignInButton>
						</SignedOut>
					</div>
				</div>
			</section>
		</main>
	);
}
