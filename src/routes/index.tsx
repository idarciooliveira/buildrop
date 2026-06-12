import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandLogo } from "../components/brand-logo";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
			<div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-cyan-400/10 blur-3xl" />
			<section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr]">
				<div className="max-w-3xl">
				<BrandLogo
					animated
					neon
					className="mb-12 text-white"
					markClassName="h-12 w-12"
					textClassName="text-xl"
				/>
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
							<Link
								className="rounded-full bg-cyan-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
								to="/sign-in"
							>
								Sign in to upload
							</Link>
						</SignedOut>
					</div>
				</div>
				<div className="relative mx-auto hidden w-full max-w-md lg:block">
					<div className="absolute inset-16 rounded-full bg-cyan-300/20 blur-3xl" />
				<img
					alt="Buildrop 3D logo"
					className="hero-neon-float relative w-full"
					src="/brand/buildrop-mark.png"
				/>
				</div>
			</section>
		</main>
	);
}
