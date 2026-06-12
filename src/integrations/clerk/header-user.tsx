import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";

export default function HeaderUser() {
	return (
		<>
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
		</>
	);
}
