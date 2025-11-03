"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { runAllTests, TestResult } from "@/lib/firebase-test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FirebaseStatus } from "@/components/firebase-status";
import { CheckCircle2, XCircle, Loader2, AlertCircle, PlayCircle } from "lucide-react";

interface TestResults {
  auth: TestResult;
  firestore: TestResult;
  storage: TestResult;
  overall: { success: boolean; totalDuration: number };
}

export default function FirebaseTestPage() {
  const { user, loading: authLoading, signInAnon } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);

  const handleRunTests = async () => {
    setTesting(true);
    setResults(null);

    try {
      const testResults = await runAllTests();
      setResults(testResults);
    } catch (error) {
      console.error("Test error:", error);
    } finally {
      setTesting(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInAnon();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    return success ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean | undefined) => {
    if (success === undefined) return <Badge variant="secondary">Pending</Badge>;
    return success ? (
      <Badge className="bg-green-500 hover:bg-green-600">Passed</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Firebase Connection Test</h1>
            <p className="text-muted-foreground mt-2">
              Verify Firebase Auth, Firestore, and Storage connectivity
            </p>
          </div>
          <FirebaseStatus />
        </div>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current user authentication state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Checking auth state...</span>
              </div>
            ) : user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Signed In</span>
                  {user.isAnonymous && <Badge variant="secondary">Anonymous</Badge>}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>User ID: {user.uid}</p>
                  {user.email && <p>Email: {user.email}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Not Signed In</span>
                </div>
                <Button onClick={handleSignIn} disabled={authLoading}>
                  Sign In Anonymously
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Run Tests</CardTitle>
            <CardDescription>
              Test Firebase services (Auth, Firestore, Storage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRunTests}
              disabled={testing || !user}
              size="lg"
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Run All Tests
                </>
              )}
            </Button>
            {!user && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Please sign in to run tests
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {results && (
          <div className="space-y-4">
            {/* Overall Status */}
            <Alert variant={results.overall.success ? "default" : "destructive"}>
              {results.overall.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {results.overall.success ? "All Tests Passed" : "Some Tests Failed"}
              </AlertTitle>
              <AlertDescription>
                Total duration: {results.overall.totalDuration}ms
              </AlertDescription>
            </Alert>

            {/* Auth Test Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(results.auth.success)}
                    Authentication Test
                  </CardTitle>
                  {getStatusBadge(results.auth.success)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{results.auth.message}</p>
                {results.auth.duration && (
                  <p className="text-xs text-muted-foreground">Duration: {results.auth.duration}ms</p>
                )}
                {results.auth.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{results.auth.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Firestore Test Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(results.firestore.success)}
                    Firestore Test
                  </CardTitle>
                  {getStatusBadge(results.firestore.success)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{results.firestore.message}</p>
                {results.firestore.duration && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {results.firestore.duration}ms
                  </p>
                )}
                {results.firestore.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{results.firestore.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Storage Test Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(results.storage.success)}
                    Storage Test
                  </CardTitle>
                  {getStatusBadge(results.storage.success)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{results.storage.message}</p>
                {results.storage.duration && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {results.storage.duration}ms
                  </p>
                )}
                {results.storage.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{results.storage.error}</AlertDescription>
                    {results.storage.error.includes("CORS") && (
                      <div className="mt-4 p-3 bg-background rounded border text-xs space-y-2">
                        <p className="font-semibold">Fix CORS Configuration:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Install Google Cloud SDK if not already installed</li>
                          <li>
                            Run: <code className="bg-muted px-1 py-0.5 rounded">gcloud auth login</code>
                          </li>
                          <li>
                            Run:{" "}
                            <code className="bg-muted px-1 py-0.5 rounded">
                              gsutil cors set cors.json gs://ai-math-tutor-e5cd2.firebasestorage.app
                            </code>
                          </li>
                        </ol>
                        <p className="text-muted-foreground mt-2">
                          The cors.json file is in your project root.
                        </p>
                      </div>
                    )}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {!results && !testing && (
          <Card>
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">What will be tested:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>Authentication:</strong> Anonymous sign-in functionality
                  </li>
                  <li>
                    <strong>Firestore:</strong> Write, read, and delete operations
                  </li>
                  <li>
                    <strong>Storage:</strong> File upload, download URL retrieval, and deletion
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Before testing:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ensure Firebase configuration is set in .env.local</li>
                  <li>Verify serviceAccountKey.json is in project root</li>
                  <li>Check that Firestore and Storage are enabled in Firebase Console</li>
                  <li>Deploy firestore.rules and storage.rules to Firebase</li>
                  <li>
                    Configure CORS for Storage (run:{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      gsutil cors set cors.json gs://YOUR-BUCKET-NAME
                    </code>
                    )
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
