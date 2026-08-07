// Dev-only dashboard shell — Vite resolves CSS imports at dev/build time; tsc
// only needs the side-effect imports to be known modules (TS2882).
declare module "*.css";
