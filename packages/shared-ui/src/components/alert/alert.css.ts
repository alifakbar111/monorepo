import { tv, type VariantProps } from "tailwind-variants/lite";

export const alertStyles = tv({
	slots: {
		base: [
			"relative w-full rounded border px-4 py-3 text-body",
			"[&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
		],
		title: "mb-1 font-medium leading-none tracking-tight",
		description: "text-body [&_p]:leading-relaxed",
	},
	variants: {
		variant: {
			default: "bg-background text-foreground",
			destructive:
				"border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive",
		},
	},
	compoundVariants: [],
	defaultVariants: {
		variant: "default",
	},
});

export type AlertVariants = VariantProps<typeof alertStyles>;
