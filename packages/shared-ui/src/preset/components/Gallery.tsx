import { useStore } from "@nanostores/react";
import { workingPreset } from "../store";
import { COMPONENT_GROUP } from "../groups";
import { Button } from "../../components/button/button";
import { Input } from "../../components/input/input";
import { Badge } from "../../components/badge/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/card/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/tabs/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/table/table";
import { Progress } from "../../components/progress/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/dialog/dialog";

function DemoButtonRow() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button variant="default">Default</Button>
			<Button variant="primary">Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button size="sm">Small</Button>
			<Button size="lg">Large</Button>
			<Badge>Badge</Badge>
		</div>
	);
}

function DemoFormRow() {
	return (
		<div className="flex max-w-md flex-col gap-2">
			<Input placeholder="Type something…" />
			<Input placeholder="Disabled" disabled />
			<Progress value={60} />
		</div>
	);
}

function DemoCardRow() {
	return (
		<Card className="w-72">
			<CardHeader>
				<CardTitle>Card title</CardTitle>
				<CardDescription>Card description</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-body text-muted-foreground">Card content</p>
			</CardContent>
		</Card>
	);
}

function DemoDataRow() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>al-ip</TableCell>
					<TableCell>
						<Badge variant="secondary">Active</Badge>
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	);
}

export function Gallery({ selection }: { selection: string }) {
	const preset = useStore(workingPreset);
	if (!preset) return <div className="p-4 text-sm text-muted-foreground">loading preset…</div>;
	if (selection === "" || selection === "tokens") {
		return (
			<div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Buttons & Badges</h3>
					<DemoButtonRow />
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Forms</h3>
					<DemoFormRow />
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Cards</h3>
					<DemoCardRow />
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Tables & Tabs</h3>
					<DemoDataRow />
					<Tabs defaultValue="a" className="mt-2">
						<TabsList>
							<TabsTrigger value="a">Tab A</TabsTrigger>
							<TabsTrigger value="b">Tab B</TabsTrigger>
						</TabsList>
						<TabsContent value="a">content A</TabsContent>
					</Tabs>
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Dialog</h3>
					<Dialog>
						<DialogContent size="sm">
							<DialogHeader>
								<DialogTitle>Small dialog</DialogTitle>
								<DialogDescription>600px → max-w-dialog-sm</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				</section>
			</div>
		);
	}
	const members = Object.keys(preset.components).filter((n) => COMPONENT_GROUP[n] === selection);
	return (
		<div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
			{members.toSorted().map((name) => (
				<section key={name} className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">{name}</h3>
					<ComponentPreview name={name} />
				</section>
			))}
		</div>
	);
}

/** Minimal per-component preview; extend with representative variants as needed. */
function ComponentPreview({ name }: { name: string }) {
	switch (name) {
		case "button":
			return <DemoButtonRow />;
		case "input":
		case "textarea":
		case "select":
			return <DemoFormRow />;
		case "card":
			return <DemoCardRow />;
		case "table":
			return <DemoDataRow />;
		case "badge":
			return <Badge>Badge</Badge>;
		default:
			return <p className="text-xs text-muted-foreground">{name} — preview not yet added</p>;
	}
}
