import { tv, type VariantProps } from "tailwind-variants/lite";

export const skeletonStyles = tv({
	base: "animate-pulse rounded bg-foreground/10",
});

export type SkeletonVariants = VariantProps<typeof skeletonStyles>;
