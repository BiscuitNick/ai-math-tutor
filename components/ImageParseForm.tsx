"use client";

/**
 * Component for parsing math problems from images using Server Actions
 */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, X, Image as ImageIcon, Check } from "lucide-react";
import Image from "next/image";
import { parseImageAction } from "@/app/actions/parse-image";
import type { ParseImageActionResult } from "@/lib/types/parsed-image";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

function SubmitButton({ hasImage }: { hasImage: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={!hasImage || pending}
      className="w-full"
    >
      {pending ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></span>
          Parsing Image...
        </>
      ) : (
        "Parse Math Problem"
      )}
    </Button>
  );
}

interface ImageParseFormProps {
  onParsed?: (extractedText: string) => void;
}

export function ImageParseForm({ onParsed }: ImageParseFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // Use useActionState for Server Action state management
  const [state, formAction] = useActionState<ParseImageActionResult | null, FormData>(
    async (_prevState, formData) => {
      const result = await parseImageAction(formData);

      // If successful and callback provided, call it
      if (result.success && result.data && onParsed) {
        onParsed(result.data.extractedText);
      }

      return result;
    },
    null
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setClientError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setClientError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection) {
        if (rejection.errors[0]?.code === "file-too-large") {
          setClientError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setClientError("Only JPG, PNG, and WEBP images are accepted");
        } else {
          setClientError("Invalid file. Please try another image.");
        }
      }
    },
  });

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setClientError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Parse Math Problem from Image</CardTitle>
        <CardDescription>
          Upload an image of a math problem and we'll extract the text using AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Error Display */}
          {(clientError || (state && !state.success)) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {clientError || state?.error || "Failed to parse image"}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {state && state.success && state.data && (
            <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
              <Check className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Successfully extracted text!</p>
                  <p className="text-sm">
                    Confidence: {Math.round(state.data.confidenceScore * 100)}%
                    {state.data.metadata?.cacheHit && " (from cache)"}
                  </p>
                  {state.data.problemBoundaries?.hasMultipleProblems && (
                    <p className="text-sm">
                      Found {state.data.problemBoundaries.problemNumber} problems
                    </p>
                  )}
                  <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border">
                    <p className="text-sm font-mono whitespace-pre-wrap">
                      {state.data.extractedText}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Image Upload Area */}
          {!imagePreview ? (
            <div
              {...getRootProps()}
              className={`
                min-h-[200px] flex flex-col items-center justify-center
                border-2 border-dashed rounded-lg p-8 cursor-pointer
                transition-colors
                ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                {isDragActive ? (
                  <span className="text-primary font-medium">
                    Drop your image here
                  </span>
                ) : (
                  <>
                    <span className="font-medium">Click to upload</span> or
                    drag and drop
                    <br />
                    <span className="text-sm">
                      JPG, PNG or WEBP (max 5MB)
                    </span>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg border-2 border-muted overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Uploaded problem"
                  width={600}
                  height={400}
                  className="w-full h-auto object-contain max-h-[400px]"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedFile && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                    <span>
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  {/* Hidden input to include file in form submission */}
                  <input
                    type="file"
                    name="image"
                    className="hidden"
                    ref={(input) => {
                      if (input && selectedFile) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(selectedFile);
                        input.files = dataTransfer.files;
                      }
                    }}
                  />
                </>
              )}

              <SubmitButton hasImage={!!selectedFile} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
