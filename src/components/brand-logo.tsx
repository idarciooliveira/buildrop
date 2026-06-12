import { Link } from "@tanstack/react-router";

type BrandLogoProps = {
	className?: string;
	markClassName?: string;
	textClassName?: string;
};

export function BrandLogo({
	className = "",
	markClassName = "h-10 w-10",
	textClassName = "",
}: BrandLogoProps) {
	return (
		<Link
			aria-label="Buildrop home"
			className={`inline-flex items-center gap-2.5 ${className}`}
			to="/"
		>
			<img
				alt=""
				className={`${markClassName} object-contain`}
				src="/brand/buildrop-mark.png"
			/>
			<span className={`font-bold tracking-tight ${textClassName}`}>
				Buildrop
			</span>
		</Link>
	);
}
