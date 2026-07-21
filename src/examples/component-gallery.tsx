import { useState } from 'react'
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  CircleAlert,
  Command as CommandIcon,
  Gauge,
  LayoutDashboard,
  Menu,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  AppShell,
  Badge,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartFrame,
  ChartLegend,
  ChartTooltipContent,
  Checkbox,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  DataList,
  DataListItem,
  DataListTerm,
  DataListValue,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FramedMedia,
  Input,
  Label,
  Navbar,
  NavbarLink,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarGroup,
  SidebarLink,
  Skeleton,
  Slider,
  Spinner,
  Stat,
  Switch,
  SystemStatus,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Timeline,
  TimelineDescription,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'

type GalleryTheme = 'signal' | 'schematic'

const chartData = [
  { sector: 'N-1', events: 18 },
  { sector: 'N-2', events: 31 },
  { sector: 'N-3', events: 24 },
  { sector: 'N-4', events: 43 },
]

function ThemeSpecimen({ theme }: { theme: GalleryTheme }) {
  return (
    <div data-theme={theme} className="border border-line bg-background p-4 text-foreground">
      <div className="flex items-center justify-between gap-3">
        <strong className="neo-kicker">{theme}</strong>
        <SystemStatus status={theme === 'signal' ? 'online' : 'idle'} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="signal">Active</Badge>
        <Badge variant="danger">Critical</Badge>
        <Badge variant="success">Nominal</Badge>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2" aria-label={`${theme} theme color tokens`}>
        <span className="h-10 border border-line bg-panel" title="Panel" />
        <span className="h-10 border border-line bg-signal" title="Signal" />
        <span className="h-10 border border-line bg-success" title="Success" />
        <span className="h-10 border border-line bg-danger" title="Danger" />
      </div>
    </div>
  )
}

export default function ComponentGallery() {
  const initialTheme = document.documentElement.dataset.theme === 'schematic' ? 'schematic' : 'signal'
  const [theme, setTheme] = useState<GalleryTheme>(initialTheme)
  const [commandOpen, setCommandOpen] = useState(false)
  const [automatic, setAutomatic] = useState(true)
  const [overlay, setOverlay] = useState(true)
  const [density, setDensity] = useState('dense')

  const applyTheme = (nextTheme: GalleryTheme) => {
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  const navigation = (
    <>
      <NavbarLink href="#foundation" active>Foundation</NavbarLink>
      <NavbarLink href="#controls">Controls</NavbarLink>
      <NavbarLink href="#feedback">Feedback</NavbarLink>
      <NavbarLink href="#data">Data</NavbarLink>
    </>
  )

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <AppShell
        className="min-h-full"
        sidebar={(
          <Sidebar
            header={<div><Badge variant="signal">DEV only</Badge><div className="neo-display mt-3 text-2xl">UI Catalog</div></div>}
            footer={<SystemStatus status="online" label="Catalog ready" />}
          >
            <SidebarGroup label="Reference">
              <SidebarLink href="#foundation" active icon={<LayoutDashboard />}>Foundation</SidebarLink>
              <SidebarLink href="#controls" icon={<Settings />}>Controls</SidebarLink>
              <SidebarLink href="#feedback" icon={<ShieldAlert />}>Feedback</SidebarLink>
              <SidebarLink href="#data" icon={<ChartNoAxesCombined />}>Data display</SidebarLink>
            </SidebarGroup>
            <SidebarGroup label="States">
              <SidebarLink href="#overlays" icon={<Menu />}>Overlays</SidebarLink>
              <SidebarLink href="#empty" icon={<CircleAlert />}>Empty/loading</SidebarLink>
            </SidebarGroup>
          </Sidebar>
        )}
        header={(
          <Navbar
            brand={<a href="#top" className="neo-display text-xl">Technical Neo</a>}
            links={navigation}
            actions={(
              <div className="flex gap-2" aria-label="Gallery theme">
                <Button size="sm" variant={theme === 'signal' ? 'signal' : 'outline'} onClick={() => applyTheme('signal')}>Signal</Button>
                <Button size="sm" variant={theme === 'schematic' ? 'signal' : 'outline'} onClick={() => applyTheme('schematic')}>Schematic</Button>
              </div>
            )}
          />
        )}
      >
        <div id="top" className="mx-auto max-w-6xl pb-16">
          <Badge variant="signal">Component reference</Badge>
          <h1 className="neo-title mt-6">Technical neo-brutalism system</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Interactive development reference for the shared Eagle Eye catalog. Open controls and overlays to inspect focus, selected, disabled, loading, and destructive states.
          </p>

          <section id="foundation" className="mt-12 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
               <div className="min-w-0"><div className="neo-kicker text-signal">01 / Foundation</div><h2 className="neo-display mt-2 break-words text-3xl sm:text-4xl">Themes and navigation</h2></div>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink href="#top">System</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>Gallery</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <ThemeSpecimen theme="signal" />
              <ThemeSpecimen theme="schematic" />
            </div>
            <Card className="mt-5">
              <CardHeader><CardTitle>Badge and status states</CardTitle><CardDescription>Semantic states retain their meaning in both themes.</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Badge>Outline</Badge><Badge variant="solid">Solid</Badge><Badge variant="signal">Signal</Badge><Badge variant="muted">Muted</Badge><Badge variant="danger">Danger</Badge><Badge variant="success">Success</Badge>
                <Separator orientation="vertical" className="h-8" />
                <SystemStatus status="online" /><SystemStatus status="warning" /><SystemStatus status="offline" /><SystemStatus status="idle" />
              </CardContent>
            </Card>
          </section>

          <section id="controls" className="mt-14 scroll-mt-24">
            <div className="neo-kicker text-signal">02 / Controls</div>
             <h2 className="neo-display mt-2 break-words border-b border-line pb-3 text-3xl sm:text-4xl">Actions and inputs</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Buttons</CardTitle><CardDescription>Action hierarchy, sizing, and unavailable states.</CardDescription></CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Button variant="signal"><Zap />Primary</Button><Button>Default</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button variant="link">Inline link</Button><Button size="icon" aria-label="Diagnostics"><Gauge /></Button><Button disabled>Disabled</Button>
                </CardContent>
                <CardFooter><Button size="sm">Small</Button><Button size="lg" variant="outline">Large action</Button></CardFooter>
              </Card>

              <Card>
                <CardHeader><CardTitle>Fields</CardTitle><CardDescription>Labels, descriptions, validation, and native controls.</CardDescription></CardHeader>
                <CardContent className="grid gap-5">
                  <Field><FieldLabel htmlFor="gallery-id">System identifier</FieldLabel><Input id="gallery-id" placeholder="NODE-4412" /><FieldDescription>Use the assigned operational identifier.</FieldDescription></Field>
                  <Field><FieldLabel htmlFor="gallery-error">Access code</FieldLabel><Input id="gallery-error" defaultValue="INVALID" aria-invalid="true" aria-describedby="gallery-error-message" /><FieldError id="gallery-error-message">Code was rejected by the authority.</FieldError></Field>
                  <Field><Label htmlFor="gallery-notes">Operational notes</Label><Textarea id="gallery-notes" placeholder="Add context for the next shift..." /></Field>
                  <Input disabled value="LOCKED FIELD" aria-label="Locked field" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Selection</CardTitle></CardHeader>
                <CardContent className="grid gap-5">
                  <Select defaultValue="north">
                    <SelectTrigger aria-label="Region"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectLabel>Operational regions</SelectLabel><SelectItem value="north">Northern sector</SelectItem><SelectItem value="central">Central sector</SelectItem><SelectSeparator /><SelectItem value="south">Southern sector</SelectItem></SelectGroup></SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2"><Checkbox defaultChecked />Enabled</label>
                    <label className="flex items-center gap-2"><Checkbox />Standby</label>
                    <label className="flex items-center gap-2 opacity-60"><Checkbox disabled />Unavailable</label>
                  </div>
                  <div className="flex items-center gap-3"><Switch id="automatic" checked={automatic} onCheckedChange={setAutomatic} /><Label htmlFor="automatic">Automatic routing</Label></div>
                  <RadioGroup defaultValue="standard" className="grid sm:grid-cols-3">
                    <label className="flex items-center gap-2"><RadioGroupItem value="standard" />Standard</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="critical" />Critical</label>
                    <label className="flex items-center gap-2 opacity-60"><RadioGroupItem value="disabled" disabled />Disabled</label>
                  </RadioGroup>
                  <Slider defaultValue={[35]} aria-label="Detection threshold" />
                  <Progress value={72} label="Deployment" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Disclosure</CardTitle></CardHeader>
                <CardContent>
                  <Tabs defaultValue="status"><TabsList><TabsTrigger value="status">Status</TabsTrigger><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="locked" disabled>Locked</TabsTrigger></TabsList><TabsContent value="status" className="border border-line-muted p-4">Nominal operation across four sectors.</TabsContent><TabsContent value="history" className="border border-line-muted p-4">Last diagnostic completed at 08:42 UTC.</TabsContent></Tabs>
                  <Accordion type="single" collapsible className="mt-6"><AccordionItem value="one"><AccordionTrigger>What is signal yellow?</AccordionTrigger><AccordionContent>The primary color for active, selected, and operationally significant content.</AccordionContent></AccordionItem><AccordionItem value="two"><AccordionTrigger>Why square corners?</AccordionTrigger><AccordionContent>Hard geometry reinforces the constructed, schematic visual language.</AccordionContent></AccordionItem></Accordion>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="feedback" className="mt-14 scroll-mt-24">
            <div className="neo-kicker text-signal">03 / Feedback</div>
             <h2 className="neo-display mt-2 break-words border-b border-line pb-3 text-3xl sm:text-4xl">System feedback</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Alert><AlertTitle>Default notice</AlertTitle><AlertDescription>Baseline system message.</AlertDescription></Alert>
              <Alert variant="signal"><AlertTitle>Signal notice</AlertTitle><AlertDescription>Capacity model updated.</AlertDescription></Alert>
              <Alert variant="success"><AlertTitle>Connection restored</AlertTitle><AlertDescription>Telemetry is flowing normally.</AlertDescription></Alert>
              <Alert variant="warning"><AlertTitle>Threshold warning</AlertTitle><AlertDescription>Sector load is above 80%.</AlertDescription></Alert>
              <Alert variant="danger"><AlertTitle>Critical state</AlertTitle><AlertDescription>Transmission node is unavailable.</AlertDescription></Alert>
              <Alert variant="info"><AlertTitle>Information</AlertTitle><AlertDescription>Archive synchronization begins at 10:00 UTC.</AlertDescription></Alert>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Demand" value="3.82 TW" detail="+8.4%" trend="up" /><Stat label="Latency" value="84 ms" detail="-12 ms" trend="down" /><Stat label="Incidents" value="03" detail="Stable" trend="flat" /><Stat label="Sources" value="12/15" detail="Three delayed" signal={false} /></div>
          </section>

          <section id="data" className="mt-14 scroll-mt-24">
            <div className="neo-kicker text-signal">04 / Data</div>
             <h2 className="neo-display mt-2 break-words border-b border-line pb-3 text-3xl sm:text-4xl">Structured intelligence</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Definition list</CardTitle></CardHeader>
                <CardContent><DataList><DataListItem><DataListTerm>Identifier</DataListTerm><DataListValue>NODE-N4412</DataListValue></DataListItem><DataListItem><DataListTerm>Position</DataListTerm><DataListValue>51.5074 N / 0.1278 W</DataListValue></DataListItem><DataListItem><DataListTerm>Confidence</DataListTerm><DataListValue>97.4%</DataListValue></DataListItem></DataList></CardContent>
              </Card>
              <FramedMedia label="Sector N-4 / optical" overlay={overlay} className="min-h-64">
                <button type="button" onClick={() => setOverlay(value => !value)} className="neo-grid grid h-64 w-full place-items-center bg-panel-subtle text-signal" aria-pressed={overlay}><Radio className="size-16" strokeWidth={1} /><span className="sr-only">Toggle media overlay</span></button>
              </FramedMedia>
            </div>

            <ChartFrame className="mt-6" title="Sector event rate" description="Validated events in the current interval" legend={<ChartLegend items={[{ label: 'Events', color: 'var(--signal)' }]} />}>
              <BarChart data={chartData}><CartesianGrid stroke="var(--line-muted)" strokeDasharray="2 2" /><XAxis dataKey="sector" stroke="var(--muted-foreground)" /><YAxis stroke="var(--muted-foreground)" /><Bar dataKey="events" fill="var(--signal)" /></BarChart>
            </ChartFrame>
            <div className="mt-4 w-fit"><ChartTooltipContent active label="N-4" payload={[{ dataKey: 'events', name: 'Events', value: 43 }]} /></div>

            <div className="mt-6">
              <Table>
                <TableCaption>Representative table states</TableCaption>
                <TableHeader><TableRow><TableHead>Node</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Events</TableHead></TableRow></TableHeader>
                <TableBody><TableRow><TableCell>N-4412</TableCell><TableCell><SystemStatus status="online" /></TableCell><TableCell className="text-right">43</TableCell></TableRow><TableRow data-state="selected"><TableCell>N-1907</TableCell><TableCell>Selected</TableCell><TableCell className="text-right">31</TableCell></TableRow></TableBody>
                <TableFooter><TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right">74</TableCell></TableRow></TableFooter>
              </Table>
              <Pagination className="mt-5"><PaginationContent><PaginationItem><PaginationPrevious href="#data" /></PaginationItem><PaginationItem><PaginationLink href="#data" isActive>1</PaginationLink></PaginationItem><PaginationItem><PaginationLink href="#data">2</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext href="#data" /></PaginationItem></PaginationContent></Pagination>
            </div>

            <Card className="mt-6">
              <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
              <CardContent><Timeline><TimelineItem><TimelineTime>08:42:14 UTC</TimelineTime><TimelineTitle>Capacity model recalculated</TimelineTitle><TimelineDescription>Forecast incorporated three new compute facilities.</TimelineDescription></TimelineItem><TimelineItem><TimelineTime>09:11:03 UTC</TimelineTime><TimelineTitle>Node N-4412 entered watch state</TimelineTitle><TimelineDescription>Load crossed the configured 90% threshold.</TimelineDescription></TimelineItem></Timeline></CardContent>
            </Card>
          </section>

          <section id="overlays" className="mt-14 scroll-mt-24">
            <div className="neo-kicker text-signal">05 / Overlays</div>
             <h2 className="neo-display mt-2 break-words border-b border-line pb-3 text-3xl sm:text-4xl">Menus and layers</h2>
            <Card className="mt-6">
              <CardContent className="flex flex-wrap gap-3">
                <Dialog><DialogTrigger asChild><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Authorize diagnostic</DialogTitle><DialogDescription>This operation queries all active telemetry sources.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><DialogClose asChild><Button variant="signal">Authorize</Button></DialogClose></DialogFooter></DialogContent></Dialog>
                <Sheet><SheetTrigger asChild><Button variant="outline">Open sheet</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Filter intelligence</SheetTitle><SheetDescription>Configure the active collection window.</SheetDescription></SheetHeader><div className="mt-6"><Slider defaultValue={[60]} aria-label="Collection window" /></div><SheetFooter><SheetClose asChild><Button variant="signal">Apply filters</Button></SheetClose></SheetFooter></SheetContent></Sheet>
                <Popover><PopoverTrigger asChild><Button variant="outline">Open popover</Button></PopoverTrigger><PopoverContent><div className="neo-kicker">Node details</div><p className="mt-2 text-sm text-muted-foreground">Compact contextual content anchored to an action.</p></PopoverContent></Popover>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline">Open menu</Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>View options</DropdownMenuLabel><DropdownMenuSeparator />
                    <DropdownMenuGroup><DropdownMenuItem><Search />Search<DropdownMenuShortcut>⌘K</DropdownMenuShortcut></DropdownMenuItem><DropdownMenuCheckboxItem checked={overlay} onCheckedChange={value => setOverlay(Boolean(value))}>Media overlay</DropdownMenuCheckboxItem></DropdownMenuGroup>
                    <DropdownMenuSeparator /><DropdownMenuRadioGroup value={density} onValueChange={setDensity}><DropdownMenuRadioItem value="dense">Dense</DropdownMenuRadioItem><DropdownMenuRadioItem value="relaxed">Relaxed</DropdownMenuRadioItem></DropdownMenuRadioGroup>
                    <DropdownMenuSub><DropdownMenuSubTrigger>Diagnostics</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuItem>Quick scan</DropdownMenuItem><DropdownMenuItem>Full scan</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="icon" variant="outline" aria-label="Alert details"><Bell /></Button></TooltipTrigger><TooltipContent>Three unacknowledged alerts</TooltipContent></Tooltip></TooltipProvider>
                <Button variant="outline" onClick={() => setCommandOpen(true)}><CommandIcon />Command dialog</Button>
                <Button variant="signal" onClick={() => toast('Diagnostic queued', { description: 'Node N-4412 will report when complete.' })}>Show toast</Button>
              </CardContent>
            </Card>
            <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
              <CommandInput placeholder="Search commands..." />
              <CommandList><CommandEmpty>No commands found.</CommandEmpty><CommandGroup heading="System"><CommandItem><Search />Search nodes<CommandShortcut>⌘F</CommandShortcut></CommandItem><CommandItem><Bell />Open alerts</CommandItem></CommandGroup><CommandSeparator /><CommandGroup heading="Operations"><CommandItem><Zap />Run diagnostic</CommandItem></CommandGroup></CommandList>
            </CommandDialog>
            <Toaster />
          </section>

          <section id="empty" className="mt-14 scroll-mt-24">
            <div className="neo-kicker text-signal">06 / Empty and loading</div>
             <h2 className="neo-display mt-2 break-words border-b border-line pb-3 text-3xl sm:text-4xl">Fallback states</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Command className="h-fit border border-line"><CommandInput placeholder="Filter catalog..." /><CommandList><CommandEmpty>No matching components.</CommandEmpty><CommandGroup heading="Available"><CommandItem><Activity />Activity feed</CommandItem><CommandItem><Gauge />Telemetry gauges</CommandItem></CommandGroup></CommandList></Command>
              <EmptyState icon={<CircleAlert />} title="No telemetry" description="Connect a source or change the selected time range." action={<Button variant="signal">Connect source</Button>} />
              <Card className="lg:col-span-2"><CardHeader><CardTitle>Loading</CardTitle></CardHeader><CardContent><Spinner label="Synchronizing sources" /><div className="mt-5 grid grid-cols-3 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div></CardContent></Card>
            </div>
          </section>
        </div>
      </AppShell>
    </div>
  )
}
