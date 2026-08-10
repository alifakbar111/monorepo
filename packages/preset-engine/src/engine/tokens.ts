import { z } from "zod";

export const colorTokensSchema = z.record(z.string());
export type ColorTokens = z.infer<typeof colorTokensSchema>;

export const tokensSchema = z.object({
  light: colorTokensSchema,
  dark: colorTokensSchema,
});

export const globalTokensSchema = z.object({
  radius: z.string(),
  spacing: z.string(),
  fontSans: z.string(),
  fontMono: z.string(),
  fontHeading: z.string().optional(),
  fontHeadingUrl: z.string().optional(),
  fontBody: z.string().optional(),
  fontBodyUrl: z.string().optional(),
  fontMonoUrl: z.string().optional(),
  sidebarWidth: z.string(),
  sidebarWidthMobile: z.string().optional(),
  sidebarWidthIcon: z.string().optional(),
});

export type GlobalTokens = z.infer<typeof globalTokensSchema>;

export interface ParsedTokens {
  colors: { light: ColorTokens; dark: ColorTokens };
  global: GlobalTokens;
}
