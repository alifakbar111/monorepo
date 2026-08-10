import { useStore } from "@nanostores/react";
import { lightColors, globalTokens } from "../store";
import { RADIUS_MULTIPLIERS } from "../engine/scales";
import { useEffect, useRef } from "react";

// Import actual shared-ui components
import { Button } from "@repo/shared-ui/components";
import { Badge } from "@repo/shared-ui/components";
import { Alert } from "@repo/shared-ui/components";
import { Input } from "@repo/shared-ui/components";
import { Textarea } from "@repo/shared-ui/components";
import { Checkbox } from "@repo/shared-ui/components";
import { Switch } from "@repo/shared-ui/components";
import { RadioGroup, RadioGroupItem } from "@repo/shared-ui/components";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/shared-ui/components";
import { Toggle } from "@repo/shared-ui/components";
import { ToggleGroup, ToggleGroupItem } from "@repo/shared-ui/components";
import { Progress } from "@repo/shared-ui/components";
import { Separator } from "@repo/shared-ui/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@repo/shared-ui/components";
import { Avatar, AvatarFallback } from "@repo/shared-ui/components";
import { Skeleton } from "@repo/shared-ui/components";
import { Slider } from "@repo/shared-ui/components";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/shared-ui/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/shared-ui/components";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@repo/shared-ui/components";
import { ScrollArea } from "@repo/shared-ui/components";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/shared-ui/components";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/shared-ui/components";
import { Heading } from "@repo/shared-ui/components";
import { Label } from "@repo/shared-ui/components";
import { AspectRatio } from "@repo/shared-ui/components";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/shared-ui/components";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/shared-ui/components";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/shared-ui/components";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@repo/shared-ui/components";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/shared-ui/components";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/shared-ui/components";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@repo/shared-ui/components";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/shared-ui/components";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@repo/shared-ui/components";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@repo/shared-ui/components";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@repo/shared-ui/components";
import { LoadingSpinner } from "@repo/shared-ui/components";
import { Calendar } from "@repo/shared-ui/components";

/**
 * Injects a <style> element that overrides CSS variables in real-time.
 * This makes the gallery react instantly to token edits.
 */
export function Gallery({ section }: { section?: string }) {
  const light = useStore(lightColors);
  const global = useStore(globalTokens);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      document.head.appendChild(styleRef.current);
    }

    const vars: string[] = [];
    for (const [k, v] of Object.entries(light)) vars.push(`--${k}: ${v};`);
    vars.push(`--radius: ${global.radius};`);
    for (const [k, m] of Object.entries(RADIUS_MULTIPLIERS)) {
      if (k === "lg") vars.push(`--radius-lg: var(--radius);`);
      else vars.push(`--radius-${k}: calc(var(--radius) * ${m});`);
    }
    vars.push(`--spacing: ${global.spacing};`);
    vars.push(`--font-sans: ${global.fontSans};`);
    vars.push(`--font-mono: ${global.fontMono};`);
    vars.push(`--sidebar-width: ${global.sidebarWidth};`);
    styleRef.current.textContent = `:root { ${vars.join("\n")} }`;
  }, [light, global]);

  // Typography preview
  if (section === "gallery:typography") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Typography</Heading>
        <div className="space-y-4">
          <div>
            <Heading level="h1">Heading 1</Heading>
            <p className="text-xs text-muted-foreground mt-1">var(--font-heading) · 1.875rem · bold</p>
          </div>
          <div>
            <Heading level="h2">Heading 2</Heading>
            <p className="text-xs text-muted-foreground mt-1">var(--font-heading) · 1.5rem · semibold</p>
          </div>
          <div>
            <Heading level="h3">Heading 3</Heading>
            <p className="text-xs text-muted-foreground mt-1">var(--font-heading) · 1.25rem · semibold</p>
          </div>
          <Separator />
          <div>
            <p className="text-base">
              Body text — The quick brown fox jumps over the lazy dog. This paragraph demonstrates the body font at 1rem regular weight.
            </p>
            <p className="text-xs text-muted-foreground mt-1">var(--font-body) · 1rem · regular</p>
          </div>
          <div>
            <p className="text-sm">
              Small text — Used for secondary content and descriptions.
            </p>
            <p className="text-xs text-muted-foreground mt-1">var(--font-body) · 0.875rem</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Caption — Used for metadata and timestamps.
            </p>
            <p className="text-xs text-muted-foreground mt-1">var(--font-body) · 0.75rem</p>
          </div>
          <Separator />
          <div>
            <pre className="p-3 rounded-md bg-muted text-sm font-mono">
{`const greeting = "Hello, World!";
console.log(greeting);`}
            </pre>
            <p className="text-xs text-muted-foreground mt-1">var(--font-mono) · code block</p>
          </div>
        </div>
      </div>
    );
  }

  // Buttons - using actual shared-ui Button component
  if (section === "gallery:buttons") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Buttons</Heading>
        <div>
          <Label className="mb-3 block">Variants</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>
        <div>
          <Label className="mb-3 block">Sizes</Label>
          <div className="flex items-center gap-2">
            <Button size="sm">sm</Button>
            <Button size="default">default</Button>
            <Button size="lg">lg</Button>
            <Button size="icon">⌘</Button>
          </div>
        </div>
      </div>
    );
  }

  // Badges - using actual shared-ui Badge component
  if (section === "gallery:badges") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Badges</Heading>
        <div>
          <Label className="mb-3 block">Variants</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>
        <div>
          <Label className="mb-3 block">Status</Label>
          <div className="flex gap-2">
            <Badge variant="success">● Success</Badge>
            <Badge variant="warning">● Warning</Badge>
            <Badge variant="info">● Info</Badge>
            <Badge variant="destructive">● Error</Badge>
          </div>
        </div>
      </div>
    );
  }

  // Alerts
  if (section === "gallery:alerts") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Alerts</Heading>
        <Alert>
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>This is a default alert with information.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Destructive Alert</AlertTitle>
          <AlertDescription>This action cannot be undone.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Inputs
  if (section === "gallery:inputs") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Inputs</Heading>
        <div className="space-y-2">
          <Input placeholder="Default input" readOnly />
          <Input placeholder="Email address" type="email" readOnly />
          <Input placeholder="Password" type="password" readOnly />
          <Input placeholder="Disabled" disabled />
        </div>
      </div>
    );
  }

  // Input OTP
  if (section === "gallery:input-otp") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Input OTP</Heading>
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    );
  }

  // Textarea
  if (section === "gallery:textarea") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Textarea</Heading>
        <Textarea placeholder="Type your message here..." readOnly />
      </div>
    );
  }

  // Checkbox
  if (section === "gallery:checkbox") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Checkbox</Heading>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox defaultChecked id="check1" />
            <Label htmlFor="check1">Checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="check2" />
            <Label htmlFor="check2">Unchecked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox disabled id="check3" />
            <Label htmlFor="check3" className="text-muted-foreground">Disabled</Label>
          </div>
        </div>
      </div>
    );
  }

  // Switch
  if (section === "gallery:switch") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Switch</Heading>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch defaultChecked id="sw1" />
            <Label htmlFor="sw1">On</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sw2" />
            <Label htmlFor="sw2">Off</Label>
          </div>
        </div>
      </div>
    );
  }

  // Radio Group
  if (section === "gallery:radio-group") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Radio Group</Heading>
        <RadioGroup defaultValue="option-a">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="option-a" id="r1" />
            <Label htmlFor="r1">Option A</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="option-b" id="r2" />
            <Label htmlFor="r2">Option B</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="option-c" id="r3" />
            <Label htmlFor="r3">Option C</Label>
          </div>
        </RadioGroup>
      </div>
    );
  }

  // Select
  if (section === "gallery:select") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Select</Heading>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Toggle
  if (section === "gallery:toggle") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Toggle</Heading>
        <div className="space-y-3">
          <Label>Variants</Label>
          <div className="flex gap-2">
            <Toggle>Default</Toggle>
            <Toggle variant="outline">Outline</Toggle>
          </div>
        </div>
      </div>
    );
  }

  // Toggle Group
  if (section === "gallery:toggle-group") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Toggle Group</Heading>
        <ToggleGroup defaultValue={["left"]}>
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="center">Center</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
      </div>
    );
  }

  // Progress
  if (section === "gallery:progress") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Progress</Heading>
        <div className="space-y-3">
          <Progress value={60} />
          <Progress value={45} />
          <Progress value={75} />
        </div>
      </div>
    );
  }

  // Separator
  if (section === "gallery:separator") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Separator</Heading>
        <div className="space-y-4">
          <div>
            <Label>Horizontal</Label>
            <Separator className="my-2" />
          </div>
          <div className="flex items-center gap-4">
            <Label>Vertical</Label>
            <Separator orientation="vertical" className="h-8" />
            <span className="text-sm text-muted-foreground">Content</span>
          </div>
        </div>
      </div>
    );
  }

  // Cards
  if (section === "gallery:cards") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Cards</Heading>
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description with current design tokens applied.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notification</CardTitle>
            <CardDescription>You have 3 unread messages.</CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button size="sm">Mark read</Button>
            <Button size="sm" variant="outline">Dismiss</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Avatar
  if (section === "gallery:avatar") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Avatar</Heading>
        <div className="flex items-center gap-3">
          <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>AB</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>CD</AvatarFallback></Avatar>
        </div>
      </div>
    );
  }

  // Skeleton
  if (section === "gallery:skeleton") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Skeleton</Heading>
        <div className="space-y-3">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // Slider
  if (section === "gallery:slider") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Slider</Heading>
        <Slider defaultValue={[60]} max={100} step={1} />
      </div>
    );
  }

  // Table
  if (section === "gallery:table") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Table</Heading>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">John Doe</TableCell>
              <TableCell><Badge variant="success">Active</Badge></TableCell>
              <TableCell className="text-muted-foreground">Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Jane Smith</TableCell>
              <TableCell><Badge variant="secondary">Inactive</Badge></TableCell>
              <TableCell className="text-muted-foreground">User</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // Tabs
  if (section === "gallery:tabs") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Tabs</Heading>
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <p className="text-sm text-muted-foreground">Make changes to your account here.</p>
          </TabsContent>
          <TabsContent value="password">
            <p className="text-sm text-muted-foreground">Change your password here.</p>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Breadcrumb
  if (section === "gallery:breadcrumb") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Breadcrumb</Heading>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  // Scroll Area
  if (section === "gallery:scroll-area") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Scroll Area</Heading>
        <ScrollArea className="h-[150px] w-[300px] rounded-md border p-4">
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="text-sm">Item {i + 1}</div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Sheet
  if (section === "gallery:sheet") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Sheet</Heading>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>Sheet description goes here.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Popover
  if (section === "gallery:popover") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Popover</Heading>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <p className="text-sm font-medium">Dimensions</p>
              <p className="text-xs text-muted-foreground">Set the dimensions for the layer.</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Tooltip
  if (section === "gallery:tooltip") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Tooltip</Heading>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add to library</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Toast
  if (section === "gallery:toast") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Toast</Heading>
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <div className="flex-1">
              <p className="text-sm font-medium">Event has been created</p>
              <p className="text-xs text-muted-foreground mt-1">Sunday, December 03, 2023 at 9:00 AM</p>
            </div>
            <Button variant="link" size="sm">Undo</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Command
  if (section === "gallery:command") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Command</Heading>
        <Command className="rounded-lg border">
          <CommandInput placeholder="Type a command..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>Calendar</CommandItem>
              <CommandItem>Search Emoji</CommandItem>
              <CommandItem>Calculator</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    );
  }

  // Hover Card
  if (section === "gallery:hover-card") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Hover Card</Heading>
        <HoverCard>
          <HoverCardTrigger asChild>
            <span className="text-sm underline decoration-dotted cursor-pointer">@radix-ui</span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex gap-3">
              <Avatar><AvatarFallback>RU</AvatarFallback></Avatar>
              <div>
                <p className="text-sm font-medium">Radix UI</p>
                <p className="text-xs text-muted-foreground">Build high-quality, accessible design systems.</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  }

  // Alert Dialog
  if (section === "gallery:alert-dialog") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Alert Dialog</Heading>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Show Alert Dialog</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Dialog
  if (section === "gallery:dialog") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Dialog</Heading>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Make changes to your profile here.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Accordion
  if (section === "gallery:accordion") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Accordion</Heading>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>Yes. It comes with default styles that match the other components.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Can it be animated?</AccordionTrigger>
            <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  // Calendar
  if (section === "gallery:calendar") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Calendar</Heading>
        <Calendar mode="single" selected={new Date()} className="rounded-md border" />
      </div>
    );
  }

  // Context Menu
  if (section === "gallery:context-menu") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Context Menu</Heading>
        <ContextMenu>
          <ContextMenuTrigger className="flex h-[150px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Right click here
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Profile</ContextMenuItem>
            <ContextMenuItem>Settings</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    );
  }

  // Resizable
  if (section === "gallery:resizable") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Resizable</Heading>
        <ResizablePanelGroup direction="horizontal" className="h-40 rounded-md border">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-2 text-sm text-muted-foreground">Left panel</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-2 text-sm text-muted-foreground">Right panel</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  // Form
  if (section === "gallery:form") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Form</Heading>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Username</Label>
            <Input placeholder="Enter username" />
          </div>
          <div className="space-y-1">
            <Label className="text-destructive">Password</Label>
            <Input placeholder="Enter password" className="border-destructive" />
            <p className="text-xs text-destructive">Password is required</p>
          </div>
        </div>
      </div>
    );
  }

  // Spinner
  if (section === "gallery:spinner") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Spinner</Heading>
        <div className="flex items-center gap-4">
          <LoadingSpinner />
          <LoadingSpinner />
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Sidebar
  if (section === "gallery:sidebar") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Sidebar</Heading>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">☰</Button>
          <Button size="icon">☰</Button>
          <Button variant="outline" size="icon">☰</Button>
        </div>
      </div>
    );
  }

  // Aspect Ratio
  if (section === "gallery:aspect-ratio") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Aspect Ratio</Heading>
        <AspectRatio ratio={16 / 9} className="bg-muted rounded-md">
          <div className="flex items-center justify-center text-sm text-muted-foreground">16:9</div>
        </AspectRatio>
      </div>
    );
  }

  // Drawer
  if (section === "gallery:drawer") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Drawer</Heading>
        <Button variant="outline">Open Drawer</Button>
      </div>
    );
  }

  // Label
  if (section === "gallery:label") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Label</Heading>
        <div className="space-y-2">
          <Label>Name</Label>
          <Label className="text-muted-foreground">Email</Label>
          <Label className="text-destructive">Error label</Label>
        </div>
      </div>
    );
  }

  // Collapsible
  if (section === "gallery:collapsible") {
    return (
      <div className="space-y-6">
        <Heading level="h2">Collapsible</Heading>
        <Collapsible>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Toggle Content</p>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">▼</Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p className="text-sm text-muted-foreground mt-2">Collapsible content goes here.</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Default: overview with real components
  return (
    <div className="space-y-4">
      <Heading level="h2">Live Preview</Heading>
      <p className="text-sm text-muted-foreground">
        Select a component from the sidebar to see its variants and sizes.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="flex gap-2">
        <Badge variant="default">Badge</Badge>
        <Badge variant="secondary">Badge</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Card</CardTitle>
          <CardDescription>Current design tokens.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Re-export Alert components that aren't exported from the barrel
function AlertTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className="mb-1 text-sm font-medium" {...props}>{children}</h5>;
}
function AlertDescription({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="text-sm" {...props}>{children}</p>;
}
