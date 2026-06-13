import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";

import { BrandLogo } from "./brand-logo";

type AppShellHeaderProps = {
	active: "dashboard" | "release-pages";
};

function navLinkClass(active: boolean) {
	return active
		? "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
		: "rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950";
}

export function AppShellHeader({ active }: AppShellHeaderProps) {
	return (
		<header className="border-b border-slate-200 bg-white">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
				<BrandLogo markClassName="h-9 w-9" textClassName="text-lg" />
				<nav className="flex items-center gap-2">
					<Link
						className={navLinkClass(active === "dashboard")}
						to="/dashboard"
					>
						Dashboard
					</Link>
					<Link
						className={navLinkClass(active === "release-pages")}
						to="/release-pages"
					>
						Release pages
					</Link>
				</nav>
				<div className="flex items-center gap-3">
					<SignedIn>
						<UserButton />
					</SignedIn>
					<SignedOut>
						<Link
							className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
							to="/sign-in"
						>
							Sign in
						</Link>
					</SignedOut>
				</div>
			</div>
		</header>
	);
}
