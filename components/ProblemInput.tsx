"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { uploadImage, UploadProgress } from "@/lib/storage";
import { MathSymbolPicker } from "@/components/MathSymbolPicker";
import { useRef } from "react";

interface ProblemInputProps {
  onSubmit: (problem: { type: "text"; content: string } | { type: "image"; content: string; file: File }) => void;
  disabled?: boolean;
}

const MAX_CHARACTERS = 500;
const MIN_CHARACTERS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function ProblemInput({ onSubmit, disabled = false }: ProblemInputProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remainingChars = MAX_CHARACTERS - textInput.length;
  const isTextValid = textInput.trim().length >= MIN_CHARACTERS;

  const handleTextSubmit = () => {
    if (!isTextValid) {
      setError(`Please enter at least ${MIN_CHARACTERS} characters`);
      return;
    }
    setError(null);
    onSubmit({ type: "text", content: textInput.trim() });
    setTextInput("");
  };

  const handleSymbolSelect = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = textInput.substring(0, start) + symbol + textInput.substring(end);

    if (newText.length <= MAX_CHARACTERS) {
      setTextInput(newText);

      // Set cursor position after the inserted symbol
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + symbol.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setError(null);
    setUploadedImage(file);

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
    disabled,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection) {
        if (rejection.errors[0]?.code === "file-too-large") {
          setError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Only JPG, PNG, and WEBP images are accepted");
        } else {
          setError("Invalid file. Please try another image.");
        }
      }
    },
  });

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setUploadProgress(0);
    setError(null);
  };

  const handleImageSubmit = async () => {
    if (!uploadedImage) {
      setError("Please upload an image first");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload image to Firebase Storage
      const imageUrl = await uploadImage(uploadedImage, (progress: UploadProgress) => {
        if (progress.status === "uploading") {
          setUploadProgress(progress.progress);
        } else if (progress.status === "error") {
          setError(progress.error || "Upload failed");
          setIsUploading(false);
        }
      });

      // Submit with both the Firebase Storage URL and the File object
      onSubmit({ type: "image", content: imageUrl, file: uploadedImage });
      handleRemoveImage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full p-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "text" | "image")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" disabled={disabled}>
            Type Problem
          </TabsTrigger>
          <TabsTrigger value="image" disabled={disabled}>
            Upload Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your math problem below
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                placeholder="Example: Solve for x: 2x + 5 = 13"
                value={textInput}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue.length <= MAX_CHARACTERS) {
                    setTextInput(newValue);
                    setError(null);
                  }
                }}
                disabled={disabled}
                className="min-h-[150px] resize-none"
                maxLength={MAX_CHARACTERS}
              />
              <div className="flex justify-between items-center">
                <MathSymbolPicker
                  onSymbolSelect={handleSymbolSelect}
                  disabled={disabled}
                />
                <span
                  className={`text-sm ${
                    remainingChars < 50
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {remainingChars} / {MAX_CHARACTERS} characters remaining
                </span>
              </div>
            </div>

            <Button
              onClick={handleTextSubmit}
              disabled={disabled || !isTextValid}
              className="w-full"
            >
              Start Problem
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="image" className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload an image of your math problem (JPG, PNG, or WEBP, max 5MB)
            </p>

            {error && activeTab === "image" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
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
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {uploadedImage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>{uploadedImage.name}</span>
                    <span>
                      ({(uploadedImage.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleImageSubmit}
                  disabled={disabled || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Start Problem"
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
