"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, User, LogOut, X, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  isActive?: boolean;
  _count?: {
    messages: number;
  };
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onLogout: () => void;
  currentSessionId: string | null;
  isCreating?: boolean;
  sessionsLoading?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({
  sessions,
  onNewChat,
  onSelectSession,
  onLogout,
  currentSessionId,
  isCreating = false,
  sessionsLoading = false,
  isMobile = false,
  onClose,
}: ChatSidebarProps) {
  const handleNewChat = () => {
    onNewChat();
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    onLogout();
    if (isMobile && onClose) {
      onClose();
    }
  };

  function truncateWords(text: string, wordLimit: number) {
    const words = text.split(" ");
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + "..."
      : text;
  }

  const SessionSkeleton = () => (
    <div className="w-full rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 mt-0.5 flex-shrink-0 dark:bg-gray-500 bg-gray-300" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4 dark:bg-gray-500 bg-gray-300" />
          <Skeleton className="h-3 w-full dark:bg-gray-500 bg-gray-300" />
          <Skeleton className="h-3 w-1/2 dark:bg-gray-500 bg-gray-300" />
        </div>
      </div>
    </div>
  );
  return (
    <div
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col h-full",
        isMobile ? "w-80 shadow-xl" : "w-80"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-between w-full gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg
              bg-[linear-gradient(to_bottom_right,#000000,#4b5563)]
              dark:bg-[linear-gradient(to_bottom_right,#1f2937,#000000)]"
            >
              <Briefcase className="h-5 w-5 text-white" />
            </div>

            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Career Co-Pilot
            </h1>
            <ThemeToggle />
          </div>
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={handleNewChat}
          disabled={isCreating}
          className="w-full cursor-pointer justify-start gap-2 bg-primary hover:opacity-90 text-primary-foreground shadow-elegant"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating..." : "New Conversation"}
        </Button>
      </div>

      {/* Chat Sessions */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-205px)] relative">
        <div className="p-4 pr-6 space-y-2">
          {sessionsLoading ? (
            // Show skeleton loading animations
            <>
              <SessionSkeleton />
              <SessionSkeleton />
              <SessionSkeleton />
            </>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-sidebar-foreground/60">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin</p>
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-colors hover:bg-slate-200 group",
                  (currentSessionId === session.id || session.isActive) &&
                    "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <div className="flex items-start gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground">
                      {truncateWords(session.title, 3)}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {truncateWords(session.lastMessage, 6)}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-sidebar-foreground/40">
                        {session.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right side white masking shadow */}
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Career Coaching
            </p>
            <p className="text-xs text-sidebar-foreground/60">Active Session</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="p-2 hover:bg-sidebar-accent cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
