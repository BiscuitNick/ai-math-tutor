"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Image as ImageIcon, X, Loader2, CheckCircle, Upload } from "lucide-react";
import { MathSymbolPicker } from "@/components/MathSymbolPicker";
import Image from "next/image";

export interface EnhancedChatInputProps {
  onSend: (data: { text: string; images: File[] }) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  currentSessionId?: string | null;
  currentSession?: any;
  onCompleteSession?: () => void;
}

export function EnhancedChatInput({
  onSend,
  isLoading = false,
  placeholder = "Type your response or drag/paste an image...",
  maxLength = 1000,
  className,
  currentSessionId,
  currentSession,
  onCompleteSession
}: EnhancedChatInputProps) {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 96;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  // Generate image preview
  useEffect(() => {
    if (image) {
      const preview = URL.createObjectURL(image);
      setImagePreview(preview);
      return () => {
        URL.revokeObjectURL(preview);
      };
    } else {
      setImagePreview(null);
    }
  }, [image]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && !image) || isLoading) return;

    await onSend({
      text: trimmedMessage,
      images: image ? [image] : []
    });

    // Clear everything
    setMessage("");
    setImage(null);
    setImagePreview(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setImage(file);
        }
        break;
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items[0]?.type.startsWith("image/")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're leaving the drop zone entirely
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsDragging(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const imageFile = Array.from(files).find(file => file.type.startsWith("image/"));
    if (imageFile) {
      setImage(imageFile);
    }
  };

  const handleSymbolSelect = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = message.substring(0, start) + symbol + message.substring(end);

    if (newText.length <= maxLength) {
      setMessage(newText);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + symbol.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const isDisabled = isLoading || (!message.trim() && !image);
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 50;
  const isOverLimit = remainingChars < 0;

  return (
    <div
      ref={dropZoneRef}
      className={cn("flex flex-col gap-2 relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Centered Image Preview */}
      {imagePreview && (
        <div className="flex justify-center p-4">
          <div className="relative group">
            <Image
              src={imagePreview}
              alt="Upload preview"
              width={200}
              height={200}
              className="rounded-lg border-2 border-border object-cover max-h-[200px] w-auto"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Drop image here</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "min-h-[48px] resize-none pr-12",
            isOverLimit && "border-destructive focus-visible:ring-destructive",
            isDragging && "opacity-50"
          )}
          maxLength={maxLength}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isDisabled || isOverLimit}
          className="absolute bottom-2 right-2 h-8 w-8"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          {/* Image Upload Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-8"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            {image ? "Replace" : "Add Image"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Math Symbol Picker */}
          <MathSymbolPicker
            onSymbolSelect={handleSymbolSelect}
            disabled={isLoading}
          />
        </div>

        {/* Mark Complete Button - Centered */}
        {currentSessionId && currentSession?.status === "in-progress" && onCompleteSession && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCompleteSession}
              className="h-8 text-xs bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-400"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs">
          <div className="text-muted-foreground hidden sm:block">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>Ctrl
            </kbd>
            {" + "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              Enter
            </kbd>
          </div>
          <div
            className={cn(
              "font-medium",
              isNearLimit && !isOverLimit && "text-orange-500",
              isOverLimit && "text-destructive"
            )}
          >
            {remainingChars}/{maxLength}
          </div>
        </div>
      </div>
    </div>
  );
}