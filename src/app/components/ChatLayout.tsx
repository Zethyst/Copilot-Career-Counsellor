"use client";
import { useState, useEffect } from "react";
import { ChatSidebar } from "./Sidebar";
import { ChatMessages } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Menu, X } from "lucide-react";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { useChat } from "@/hooks/use-chat";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const { userId, login, logout, isLoading: userLoading } = useUser();
  const { sessions, createSession, refreshSessions, isCreating, sessionsLoading } =
    useChatSessions(userId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    messages,
    sendMessage,
    isLoading: chatLoading,
    messagesLoading,
  } = useChat(currentSessionId, userId);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Set active session from sessions
  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      const activeSession = sessions.find((s) => s.isActive) || sessions[0];
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
      }
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    // Set initialized once we have sessions data
    if (sessions !== undefined) {
      setIsInitialized(true);
    }
  }, [sessions]);

  // Handle window resize to close sidebar on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.getElementById("mobile-sidebar");
        const menuButton = document.getElementById("mobile-menu-button");

        if (
          sidebar &&
          !sidebar.contains(event.target as Node) &&
          menuButton &&
          !menuButton.contains(event.target as Node)
        ) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if no user
  if (!userId) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (email.trim()) {
        try {
          await login(email.trim(), name.trim() || undefined);
        } catch (error) {
          toast.error("Login failed");
          console.error("Login failed:", error);
        }
      }
    };

    return (
      <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden">
        {/* Floating Orbs */}
        <div className="absolute -top-24 -left-32 w-72 h-72 rounded-full bg-purple-500/30 blur-3xl animate-orb" />
        <div className="absolute md:top-1/2 bottom-1  -right-30 md:w-96 md:h-96 w-72 h-72 rounded-full bg-blue-500/30 blur-3xl animate-orb animation-delay-2000" />
        <div className="absolute md:block hidden bottom-0 left-1/12 md:w-96 md:h-80 w-72 h-72 rounded-full bg-pink-500/30 blur-3xl animate-orb animation-delay-4000" />

        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[linear-gradient(to_bottom_right,#000000,#4b5563)] mx-auto mb-4">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">
              AI Career Co-Pilot
            </CardTitle>
            <p className="text-muted-foreground">
              Get personalized career guidance and professional development
              advice
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="name">Name (Optional)</label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={!email.trim() || userLoading}
              >
                {userLoading ? "Starting..." : "Start Career Coaching"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleNewChat = async () => {
    try {
      const session = await createSession("New Conversation");
      if (session) {
        setCurrentSessionId(session.id);
        // Close sidebar on mobile after creating new chat
        if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
        }
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Close sidebar on mobile after selecting session
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content, (newSessionId) => {
        // This callback is called when a new session is created
        setCurrentSessionId(newSessionId);
        // Refresh sessions to get the updated title from backend
        setTimeout(() => {
          refreshSessions();
        }, 1000);
      });

      // Refresh sessions to get any title updates
      setTimeout(() => {
        refreshSessions();
      }, 1000);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-chat-background relative">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ease-in-out"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar - always visible on md and up */}
      <div className="hidden md:block">
        <ChatSidebar
          sessions={sessions}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onLogout={handleLogout}
          currentSessionId={currentSessionId}
          isCreating={isCreating}
          sessionsLoading={sessionsLoading}
        />
      </div>

      {/* Mobile sidebar - slides in from left */}
      <div
        id="mobile-sidebar"
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 md:hidden transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ChatSidebar
          sessions={sessions}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onLogout={handleLogout}
          currentSessionId={currentSessionId}
          isCreating={isCreating}
          sessionsLoading={sessionsLoading}
          isMobile={true}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header with menu button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
          <Button
            id="mobile-menu-button"
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2 cursor-pointer"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <h1 className="text-lg font-semibold">AI Career Co-Pilot</h1>
          <div className="w-9" />
        </div>

        <ChatMessages
          messages={messages}
          isLoading={chatLoading}
          messagesLoading={messagesLoading}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={chatLoading}
          placeholder={
            messages.length === 0
              ? "Hi! I'm your AI career coach. How can I help you with your career today?"
              : "Ask me about your career..."
          }
        />
      </div>
    </div>
  );
}
