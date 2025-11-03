"use client";

/**
 * Sidebar component for displaying session history with search, filter, and pagination
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { querySessions } from "@/lib/firestore/sessions";
import type { Session, SessionStatus } from "@/lib/types/session";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface HistorySidebarProps {
  /**
   * Callback when user wants to start a new session
   */
  onNewSession?: () => void;

  /**
   * Callback when user selects a session to view/resume
   */
  onSelectSession?: (session: Session) => void;

  /**
   * Currently active session ID (to highlight in list)
   */
  currentSessionId?: string;
}

const SESSIONS_PER_PAGE = 20;

export function HistorySidebar({
  onNewSession,
  onSelectSession,
  currentSessionId,
}: HistorySidebarProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Load sessions when sidebar opens
  useEffect(() => {
    if (open && user) {
      loadSessions(true);
    }
  }, [open, user, statusFilter]);

  // Apply search filter
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      searchQuery === "" ||
      session.problem.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  async function loadSessions(reset = false) {
    if (!user) return;

    setLoading(true);
    try {
      const result = await querySessions(user.uid, {
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: SESSIONS_PER_PAGE,
        startAfter: reset ? undefined : lastDoc,
      });

      if (reset) {
        setSessions(result.sessions);
      } else {
        setSessions((prev) => [...prev, ...result.sessions]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLoadMore() {
    if (!loading && hasMore) {
      loadSessions(false);
    }
  }

  function getStatusBadge(status: SessionStatus) {
    const variants: Record<SessionStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      active: {
        variant: "default",
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: "Active",
      },
      completed: {
        variant: "secondary",
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
        label: "Completed",
      },
      abandoned: {
        variant: "outline",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
        label: "Abandoned",
      },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:w-[400px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Session History</SheetTitle>
            <SheetDescription>
              View and resume past math problem sessions
            </SheetDescription>
          </SheetHeader>

          {/* New Session Button */}
          <div className="px-6 pb-4">
            <Button
              onClick={() => {
                onNewSession?.();
                setOpen(false);
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start New Problem
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>

          {/* Session List */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 pb-6">
              {loading && sessions.length === 0 ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardHeader>
                  </Card>
                ))
              ) : filteredSessions.length === 0 ? (
                // Empty state
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">
                    {searchQuery
                      ? "No sessions found matching your search"
                      : "No sessions yet. Start a new problem!"}
                  </p>
                </div>
              ) : (
                // Session cards
                filteredSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow",
                      currentSessionId === session.id && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      onSelectSession?.(session);
                      setOpen(false);
                    }}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-sm line-clamp-2">
                          {session.problem}
                        </CardTitle>
                        {getStatusBadge(session.status)}
                      </div>
                      <CardDescription className="text-xs">
                        {formatDistanceToNow(session.startedAt, { addSuffix: true })}
                        {session.turnCount > 0 && ` • ${session.turnCount} messages`}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}

              {/* Load More Button */}
              {hasMore && !loading && filteredSessions.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLoadMore}
                >
                  Load More
                </Button>
              )}

              {/* Loading indicator for pagination */}
              {loading && sessions.length > 0 && (
                <div className="text-center py-4">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
