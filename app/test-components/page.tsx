"use client"

import { useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { AlertCircle, Info } from "lucide-react"

export default function TestComponentsPage() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster />

      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Component Showcase</h1>
            <p className="text-muted-foreground mt-2">Testing all shadcn/ui components with theming</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Button Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        {/* Card Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is the main content of the card component.</p>
              </CardContent>
              <CardFooter>
                <Button>Action</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Math Problem</CardTitle>
                <CardDescription>Algebra - Equations</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Solve for x: 2x + 5 = 13</p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Badge>In Progress</Badge>
                <Badge variant="secondary">Turn 5</Badge>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Form Inputs Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Form Inputs</h2>
          <div className="max-w-md space-y-4">
            <div>
              <label className="text-sm font-medium">Input</label>
              <Input placeholder="Enter your text here..." />
            </div>
            <div>
              <label className="text-sm font-medium">Textarea</label>
              <Textarea placeholder="Type your problem here..." rows={4} />
            </div>
          </div>
        </section>

        {/* ScrollArea Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Scroll Area</h2>
          <ScrollArea className="h-72 w-full max-w-md rounded-md border p-4">
            <div className="space-y-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="text-sm">
                  Message {i + 1}: This is a sample message in the scroll area.
                </div>
              ))}
            </div>
          </ScrollArea>
        </section>

        {/* Alert Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Alerts</h2>
          <div className="space-y-4 max-w-2xl">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>
                This is an informational alert message.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Something went wrong. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Toast Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Toast Notifications</h2>
          <div className="flex gap-3">
            <Button onClick={() => toast("Default toast notification")}>
              Default Toast
            </Button>
            <Button onClick={() => toast.success("Success! Your action completed.")}>
              Success Toast
            </Button>
            <Button onClick={() => toast.error("Error! Something went wrong.")}>
              Error Toast
            </Button>
          </div>
        </section>

        {/* Skeleton Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Skeleton Loading</h2>
          <div className="space-y-3 max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </section>

        {/* Badge Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* Sheet Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Sheet (Drawer)</h2>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button>Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Session History</SheetTitle>
                <SheetDescription>
                  View your past problem-solving sessions
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Problem 1</CardTitle>
                    <CardDescription>Solved 2 hours ago</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Problem 2</CardTitle>
                    <CardDescription>Solved yesterday</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </section>

        {/* Tabs Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Tabs</h2>
          <Tabs defaultValue="type" className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="type">Type Problem</TabsTrigger>
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
            </TabsList>
            <TabsContent value="type" className="space-y-4">
              <Textarea placeholder="Type your math problem here..." />
              <Button>Start Problem</Button>
            </TabsContent>
            <TabsContent value="upload" className="space-y-4">
              <Input type="file" accept="image/*" />
              <Button>Upload & Parse</Button>
            </TabsContent>
          </Tabs>
        </section>

        {/* Popover Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Popover</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open Math Symbols</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <h4 className="font-medium">Math Symbols</h4>
                <div className="grid grid-cols-6 gap-2">
                  {["±", "×", "÷", "√", "π", "∞", "∑", "∫", "≤", "≥", "≠", "≈"].map((symbol) => (
                    <Button key={symbol} variant="ghost" size="sm">
                      {symbol}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </section>

        {/* Tooltip Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Tooltip</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a helpful tooltip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </section>

        {/* Dialog Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Dialog</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your session.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </div>
  )
}
