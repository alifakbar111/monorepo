import ts from "typescript";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveComponentRadius } from "./component-map";

export interface Substitution {
	from: string;
	to: string;
}

export interface TransformResult {
	code: string;
	report: Substitution[];
	changed: boolean;
}

/**
 * Class substitution rules. Order matters: longest prefixes first.
 * Corner radius → `rounded` (inherit base) for inheriting components, or
 * `rounded-<token>` where `<token>` is the group OR the component name when that
 * component overrides its group (see resolveComponentRadius in component-map.ts).
 */
export function buildRules(radiusToken: "inherit" | string): Array<{ match: RegExp; to: (m: string) => string }> {
	const radiusClass = radiusToken === "inherit" ? "rounded" : `rounded-${radiusToken}`;
	return [
		// corner radius → semantic token (base or per-group opt-out)
		{ match: /\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/g, to: () => radiusClass },
		// body text sizes → role tokens
		{ match: /\btext-sm\b/g, to: () => "text-body" },
		{ match: /\btext-xs\b/g, to: () => "text-caption" },
		{ match: /\btext-base\b/g, to: () => "text-body-lg" },
		{ match: /\btext-lg\b/g, to: () => "text-title" },
		// hardcoded button colors → semantic color tokens
		{ match: /\bbg-gray-900\b/g, to: () => "bg-button-default" },
		{ match: /\btext-white\b/g, to: (m) => (m === "text-white" ? "text-button-default-foreground" : m) },
	];
}

/** Scan a class string for tokens that should be tokenized but aren't (the guard). */
export function untokenizedClasses(classString: string): string[] {
	const found = new Set<string>();
	const patterns = [
		/\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/,
		/\btext-(xs|sm|base|lg)\b/,
		/\bbg-gray-[0-9]+\b/,
	];
	for (const p of patterns) {
		const m = classString.match(p);
		if (m) found.add(m[0]);
	}
	return [...found];
}

function transformClassString(input: string, rules: ReturnType<typeof buildRules>): { out: string; report: Substitution[] } {
	const report: Substitution[] = [];
	let out = input;
	for (const rule of rules) {
		out = out.replace(rule.match, (matched) => {
			const to = rule.to(matched);
			if (to !== matched) report.push({ from: matched, to });
			return to;
		});
	}
	return { out, report };
}

/** Insert a `size` variant into the `variants` object of the tv() config. */
function addSizeVariant(source: ts.SourceFile, sizes: string[], widthPrefix: string): ts.SourceFile {
	const tvCall = findTvCall(source);
	if (!tvCall) return source;
	const arg = tvCall.arguments[0];
	if (!arg || !ts.isObjectLiteralExpression(arg)) return source;
	const variantsProp = arg.properties.find(
		(p): p is ts.PropertyAssignment =>
			ts.isPropertyAssignment(p) && p.name.getText(source) === "variants",
	);
	// idempotency guard: if a `size` variant already exists, the file is already tokenized
	if (
		variantsProp &&
		ts.isObjectLiteralExpression(variantsProp.initializer) &&
		variantsProp.initializer.properties.some(
			(p) => ts.isPropertyAssignment(p) && p.name.getText(source) === "size",
		)
	) {
		return source;
	}
	const sizeObject = ts.factory.createObjectLiteralExpression(
		sizes.map((key) =>
			ts.factory.createPropertyAssignment(
				key,
				ts.factory.createStringLiteral(`${widthPrefix}${key}`),
			),
		),
		true,
	);
	const variantProp = ts.factory.createPropertyAssignment("size", sizeObject);
	let newVariants: ts.ObjectLiteralExpression;
	if (variantsProp && ts.isObjectLiteralExpression(variantsProp.initializer)) {
		newVariants = ts.factory.updateObjectLiteralExpression(variantsProp.initializer, [
			...variantsProp.initializer.properties,
			variantProp,
		]);
	} else {
		newVariants = ts.factory.createObjectLiteralExpression([variantProp], true);
	}
	const newArg = ts.factory.updateObjectLiteralExpression(arg, [
		...arg.properties.filter((p) => !(ts.isPropertyAssignment(p) && p.name.getText(source) === "variants")),
		ts.factory.createPropertyAssignment("variants", newVariants),
	]);
	const newCall = ts.factory.updateCallExpression(
		tvCall,
		tvCall.expression,
		tvCall.typeArguments,
		[newArg, ...tvCall.arguments.slice(1)],
	);
	const result = ts.transform(source, [
		(context) => (rootNode: ts.Node) => {
			const visit = (node: ts.Node): ts.Node => {
				node = ts.visitEachChild(node, visit, context);
				if (node === tvCall) return newCall;
				return node;
			};
			return ts.visitNode(rootNode, visit);
		},
	]);
	const updated = result.transformed[0] as ts.SourceFile;
	result.dispose();
	return updated;
}

function findTvCall(source: ts.SourceFile): ts.CallExpression | undefined {
	let found: ts.CallExpression | undefined;
	function visit(node: ts.Node) {
		if (ts.isCallExpression(node) && node.expression.getText(source) === "tv") {
			found = node;
			return;
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	return found;
}

export function transformCssTs(
	sourceText: string,
	componentName: string,
	radiusToken: "inherit" | string,
	sizes: string[] = [],
	widthPrefix = `max-w-${componentName}-`,
): TransformResult {
	const rules = buildRules(radiusToken);
	let source = ts.createSourceFile("x.css.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

	const report: Substitution[] = [];
	let changed = false;

	const newText = source.text.replace(/("([^"\\]|\\.)*")/g, (whole, quote: string) => {
		// only rewrite string literals that look like Tailwind class lists
		if (!/(rounded-|text-(xs|sm|base|lg)\b|bg-gray-|shadow-)/.test(quote)) return whole;
		const { out, report: r } = transformClassString(quote, rules);
		if (out !== quote) {
			changed = true;
			report.push(...r);
		}
		return out;
	});

	if (sizes.length > 0) {
		source = ts.createSourceFile("x.css.ts", newText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		const withSize = addSizeVariant(source, sizes, widthPrefix);
		const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
		const finalCode = printer.printFile(withSize);
		return { code: finalCode, report, changed: changed || withSize !== source };
	}

	return { code: newText, report, changed };
}

export interface CodemodOptions {
	componentsDir: string;
	preset: import("./types").Preset;
}

export function runCodemod(opts: CodemodOptions): {
	changedFiles: string[];
	untokenizedFiles: string[];
	report: Array<{ file: string; from: string; to: string }>;
} {
	const { componentsDir, preset } = opts;
	const changedFiles: string[] = [];
	const untokenizedFiles: string[] = [];
	const report: Array<{ file: string; from: string; to: string }> = [];

	const specs = new Map(
		Object.entries(preset.components).map(([name, e]) => [name, e.group] as const),
	);

	// Per-component width prefix helper: `<component>-<size>` (dialog → max-w-dialog-sm),
	// matching the `--container-<component>-<size>` tokens the codegen emits.
	const widthPrefix = (name: string, key: string) => `max-w-${name}-${key}`;

	for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const file = join(dir.parentPath, dir.name, `${dir.name}.css.ts`);
		if (file.endsWith(".css.ts") === false) continue;
		const cssFile = resolve(componentsDir, dir.name, `${dir.name}.css.ts`);
		if (!existsSync(cssFile)) continue;
		const sourceText = readFileSync(cssFile, "utf8");
		const group = specs.get(dir.name);
		if (!group) {
			// new/unadopted component — scan for untokenized classes
			const found = untokenizedClasses(sourceText);
			if (found.length > 0) {
				untokenizedFiles.push(dir.name);
				report.push({ file: dir.name, from: found.join(","), to: "(UNADOPTED)" });
			}
			continue;
		}
		const sizes = Object.keys(
			(preset.components[dir.name] as { sizes?: Record<string, unknown> } | undefined)?.sizes ?? {},
		);
		// three-tier radius: component override (→ rounded-<name>), else group opt-out
		// (→ rounded-<group>), else inherit (→ rounded). The token comes from the
		// resolution, NOT the group name, so component-level overrides win.
		const resolved = resolveComponentRadius(preset, dir.name, group);
		const radiusToken = resolved.kind === "inherit" ? "inherit" : resolved.token;
		const result = transformCssTs(sourceText, dir.name, radiusToken, sizes, widthPrefix(dir.name, ""));
		if (result.changed) {
			writeFileSync(cssFile, result.code);
			changedFiles.push(dir.name);
			for (const s of result.report) report.push({ file: dir.name, from: s.from, to: s.to });
		}
		const remaining = untokenizedClasses(result.code);
		if (remaining.length > 0) {
			untokenizedFiles.push(`${dir.name} (residual: ${remaining.join(", ")})`);
		}
	}

	return { changedFiles, untokenizedFiles, report };
}

function existsSync(p: string): boolean {
	try {
		readFileSync(p);
		return true;
	} catch {
		return false;
	}
}
