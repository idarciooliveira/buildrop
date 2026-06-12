import { SignIn } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandLogo } from "../components/brand-logo";

export const Route = createFileRoute("/sign-in")({ component: SignInPage });

// slate-900 in hex — must match colorBackground so Clerk's footer doesn't flash a different tone
const CARD_BG = "#0f172a";

function SignInPage() {
	return (
		<main className="min-h-screen bg-[#070c18] text-white">
			<section className="mx-auto grid min-h-screen max-w-6xl gap-12 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
				{/* Left — marketing copy */}
				<div className="max-w-xl">
					<BrandLogo
						className="mb-10 text-white"
						markClassName="h-12 w-12"
						textClassName="text-xl"
					/>
					<Link
						className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
						to="/"
					>
						← Back to home
					</Link>

					<p className="mt-8 inline-flex rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-300">
						Sign in to manage builds
					</p>

					<h1 className="mt-5 text-balance text-5xl font-bold tracking-tight sm:text-[4.5rem] sm:leading-[1.08]">
						One place for every test build.
					</h1>

					<p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
						Use your Buildrop account to upload IPA and APK files, track app
						metadata, and share clean install links with testers.
					</p>
				</div>

				{/* Right — Clerk sign-in widget */}
				<div
					className="rounded-2xl border border-slate-800 px-6 py-8 shadow-2xl shadow-black/60"
					style={{ backgroundColor: CARD_BG }}
				>
					<SignIn
						routing="path"
						path="/sign-in"
						forceRedirectUrl="/dashboard"
						appearance={{
							variables: {
								// Must exactly match CARD_BG so Clerk's own footer bg blends in
								colorBackground: CARD_BG,
								colorPrimary: "#0ea5e9",
								colorText: "#f1f5f9",
								colorTextSecondary: "#94a3b8",
								colorInputBackground: "#0c1628",
								colorInputText: "#f1f5f9",
								colorDanger: "#f87171",
								borderRadius: "0.625rem",
								fontFamily: "inherit",
							},
							elements: {
								card: "w-full border-0 shadow-none p-0",
								headerTitle: "text-white font-semibold",
								headerSubtitle: "text-slate-400",
								// Calm sky-500 button — readable white text, not neon
								formButtonPrimary:
									"bg-sky-500 text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-400 active:bg-sky-600 font-medium",
								formFieldLabel: "text-slate-300 text-sm font-medium",
								formFieldInput:
									"border border-slate-700 bg-[#0c1628] text-white placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/25 transition-colors",
								footerActionLink:
									"text-sky-400 hover:text-sky-300 font-medium transition-colors",
								footerActionText: "text-slate-400",
								socialButtonsBlockButton:
									"border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-colors",
								socialButtonsBlockButtonText: "text-slate-200 font-medium",
								dividerLine: "bg-slate-700/70",
								dividerText: "text-slate-500",
								// Force footer to inherit the same bg — fixes the black-box clash
								footer: "rounded-b-xl",
							},
						}}
					/>
				</div>
			</section>
		</main>
	);
}
