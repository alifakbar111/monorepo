# Shared UI Library

This is a shared UI library, a comprehensive collection of React components built with
modern web development best practices. Under the hood, it uses Tailwind CSS, Radix UI,
and TypeScript to deliver accessible, type-safe, and customizable components.

The UI components leverage [shadcn/ui](https://ui.shadcn.com/) as their foundation,
enhanced with custom modifications. The notable distinction lies in the styling
implementation, which utilizes [Tailwind Variants](https://www.tailwind-variants.org/)
for a more flexible approach and [tailwindcss-motion](https://rombo.co/tailwind) for
animations and transitions effects.

## Enabling the package

Add the following to your `package.json` file:

```json
{
    "dependencies": {
        "@repo/shared-ui": "workspace:*"
    },
    "devDependencies": {
        "@tailwindcss/vite": "^4.1.4",
        "tailwind-variants": "^1.0.0",
        "tailwindcss-motion": "^1.1.0",
        "tailwindcss": "^4.1.5",
    }
}
```

Add the following to your `tsconfig.json` file:

```json
{
    "references": [{ "path": "../../packages/shared-ui" }]
}
```

Exclude internal packages from optimization, add the following to your `vite.config.ts` file:

```ts
export default defineConfig({
  // ...
  optimizeDeps: {
    // Do not optimize internal workspace dependencies.
    exclude: ['@repo/shared-ui'],
  },
})
```

Add `shared-ui` source list to `global.css`:

```css
@source "../../../../packages/shared-ui/**/*.{ts,tsx}";
```

Finally, add the following to your `moon.yml` file:

```yaml
dependsOn:
  - 'shared-ui'
```

## Theming & design tokens

Design tokens (colors, border radius, spacing, sidebar width, fonts) live in
`src/styles/colors.css`, `global.css`, and `fontface.css`. Run Storybook
(`pnpm --filter shared-ui storybook`) and open the **Theme Editor** panel to
edit tokens live and sync them straight back into those files — see
[`.storybook/addons/theme-editor/README.md`](./.storybook/addons/theme-editor/README.md)
for how it works, including the font Name-vs-URL fields and the rem/px size
inputs. It's a dev-only Storybook addon and never ships to production.
