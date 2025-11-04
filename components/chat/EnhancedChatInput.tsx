"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Image as ImageIcon, X, Loader2, CheckCircle } from "lucide-react";
import { MathSymbolPicker } from "@/components/MathSymbolPicker";
import Image from "next/image";

export interface EnhancedChatInputProps {
  onSend: (data: { text: string; images: File[] }) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  maxImages?: number;
  className?: string;
  currentSessionId?: string | null;
  currentSession?: any;
  onCompleteSession?: () => void;
}

export function EnhancedChatInput({
  onSend,
  isLoading = false,
  placeholder = "Type your response or paste/upload images...",
  maxLength = 1000,
  maxImages = 5,
  className,
  currentSessionId,
  currentSession,
  onCompleteSession
}: EnhancedChatInputProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 96;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  // Generate image previews
  useEffect(() => {
    const previews = images.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && images.length === 0) || isLoading) return;

    await onSend({ text: trimmedMessage, images });

    // Clear everything
    setMessage("");
    setImages([]);
    setImagePreviews([]);
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

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      addImages(imageFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addImages = (newFiles: File[]) => {
    const remainingSlots = maxImages - images.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    setImages(prev => [...prev, ...filesToAdd]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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

  const isDisabled = isLoading || (!message.trim() && images.length === 0);
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 50;
  const isOverLimit = remainingChars < 0;
  const canAddMoreImages = images.length < maxImages;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Image Previews */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap p-2 bg-muted rounded-lg">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <Image
                src={preview}
                alt={`Upload ${index + 1}`}
                width={80}
                height={80}
                className="rounded border object-cover w-20 h-20"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {images.length < maxImages && (
            <div className="flex items-center text-xs text-muted-foreground">
              {maxImages - images.length} more
            </div>
          )}
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
            isOverLimit && "border-destructive focus-visible:ring-destructive"
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Image Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAddMoreImages || isLoading}
            className="h-8"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Image ({images.length}/{maxImages})
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Math Symbol Picker */}
          <MathSymbolPicker
            onSymbolSelect={handleSymbolSelect}
            disabled={isLoading}
          />

          {/* Mark Complete Button */}
          {currentSessionId && currentSession?.status === "in-progress" && onCompleteSession && (
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
          )}
        </div>

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
