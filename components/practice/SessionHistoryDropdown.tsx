"use client";

import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getSessionHistory } from "@/lib/firestore/sessions";
import type { Session } from "@/lib/types/session";
import { formatDistanceToNow } from "date-fns";

export interface SessionHistoryDropdownProps {
  userId: string;
  onSelectSession?: (session: Session) => void;
  className?: string;
}

export function SessionHistoryDropdown({
  userId,
  onSelectSession,
  className,
}: SessionHistoryDropdownProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && sessions.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = await getSessionHistory(userId, 10);
      setSessions(history);
    } catch (error) {
      console.error("Error loading session history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "abandoned":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Session History</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading && (
          <div className="p-4 text-sm text-center text-muted-foreground">
            Loading history...
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="p-4 text-sm text-center text-muted-foreground">
            No completed sessions yet
          </div>
        )}

        {!isLoading &&
          sessions.map((session) => (
            <DropdownMenuItem
              key={session.id}
              className="flex flex-col items-start gap-1 cursor-pointer p-3"
              onClick={() => onSelectSession?.(session)}
            >
              <div className="flex items-center gap-2 w-full">
                {getStatusIcon(session.status)}
                <span className="font-medium text-sm flex-1">
                  {truncateText(session.problemText)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                <span className="capitalize">{session.problemType}</span>
                <span>•</span>
                <span>{session.turnCount} turns</span>
                <span>•</span>
                <span>
                  {session.completedAt
                    ? formatDistanceToNow(session.completedAt, { addSuffix: true })
                    : formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                </span>
              </div>

              {session.metadata?.isPracticeMode && (
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  Practice Problem
                </div>
              )}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
