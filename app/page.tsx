import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <main className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            AI Math Tutor
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A Socratic method-based math tutoring application that guides students through problem-solving
          </p>
        </div>

        {/* Test Pages Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {/* Chat UI Test */}
          <Link href="/test-chat">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Chat UI Test</CardTitle>
                  <Badge variant="secondary">Task 3</Badge>
                </div>
                <CardDescription>
                  Test the chat interface components with mock data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Message bubbles</li>
                  <li>• Auto-scroll behavior</li>
                  <li>• Input validation</li>
                  <li>• Typing indicators</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* AI Chat Test */}
          <Link href="/test-ai-chat">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-blue-200 dark:border-blue-900">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>AI Chat Test</CardTitle>
                  <Badge variant="default">Task 4</Badge>
                </div>
                <CardDescription>
                  Test Socratic tutoring with GPT-4
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Live AI responses</li>
                  <li>• Socratic method</li>
                  <li>• Streaming chat</li>
                  <li>• Error handling</li>
                </ul>
                <Badge variant="outline" className="mt-3 text-xs">
                  Requires OpenAI API key
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Test Components */}
          <Link href="/test-components">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Components Test</CardTitle>
                  <Badge variant="outline">Dev</Badge>
                </div>
                <CardDescription>
                  View all shadcn/ui components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Button variants</li>
                  <li>• Card styles</li>
                  <li>• Input components</li>
                  <li>• Theme toggle</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          {/* Firebase Test */}
          <Link href="/firebase-test">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Firebase Test</CardTitle>
                  <Badge variant="outline">Task 1</Badge>
                </div>
                <CardDescription>
                  Test Firebase connection and authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Connection status</li>
                  <li>• Authentication</li>
                  <li>• Firestore access</li>
                  <li>• Storage access</li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Status Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Status</CardTitle>
              <CardDescription>Current development progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task 1: Firebase Setup</span>
                  <Badge variant="secondary">Complete</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task 2: Authentication</span>
                  <Badge variant="secondary">Complete</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task 3: Chat UI Components</span>
                  <Badge variant="secondary">Complete</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task 4: AI Integration (GPT-4)</span>
                  <Badge variant="secondary">Complete</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task 5: Problem Input System</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task 6: OpenAI Vision (OCR)</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Built with Next.js 15, React 19, TypeScript, and shadcn/ui</p>
        </div>
      </main>
    </div>
  );
}
