import { Link } from "@tanstack/react-router";

type BrandLogoProps = {
	className?: string;
	markClassName?: string;
	textClassName?: string;
	/** Float the mark with a gravity-driven bounce animation */
	animated?: boolean;
	/** Apply cyan neon glow to the mark and text (best on dark backgrounds) */
	neon?: boolean;
};

export function BrandLogo({
	className = "",
	markClassName = "h-10 w-10",
	textClassName = "",
	animated = false,
	neon = false,
}: BrandLogoProps) {
	const markAnimClass = neon
		? "logo-neon-mark"
		: animated
			? "logo-gravity"
			: "";
	const textAnimClass = neon ? "logo-neon-text" : "";

	return (
		<Link
			aria-label="Buildrop home"
			className={`inline-flex items-center gap-2.5 ${className}`}
			to="/"
		>
			<img
				alt=""
				className={`${markClassName} object-contain ${markAnimClass}`}
				src="/brand/buildrop-mark.png"
			/>
			<span
				className={`font-bold tracking-tight ${textClassName} ${textAnimClass}`}
			>
				Buildrop
			</span>
		</Link>
	);
}
