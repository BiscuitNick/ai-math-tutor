"use client";

import { ImageParseForm } from "@/components/ImageParseForm";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check } from "lucide-react";

export default function TestImageParsePage() {
  const [parsedText, setParsedText] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Image Parsing Test</h1>
      <p className="text-muted-foreground mb-6">
        Test the OpenAI Vision API integration with Server Actions
      </p>

      <ImageParseForm
        onParsed={(text) => {
          setParsedText(text);
        }}
      />

      {parsedText && (
        <div className="mt-6">
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Check className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Parsed text received by parent component:</p>
                <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                  <p className="text-sm font-mono whitespace-pre-wrap">
                    {parsedText}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
