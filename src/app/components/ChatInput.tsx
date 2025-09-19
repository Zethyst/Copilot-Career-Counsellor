"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Ask me about your career...",
  className 
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn("border-t bg-background p-6", className)}>
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[40px] text-xs md:text-sm outline-none border-none max-h-32 resize-none pr-12 bg-muted/30 "
              rows={1}
            />
          </div>
          
          <Button
            type="submit"
            disabled={!message.trim() || disabled}
            className="h-[40px] w-10 px-6 bg-[linear-gradient(135deg,hsl(258,89%,66%),hsl(258,89%,76%))] hover:opacity-90 text-primary-foreground shadow-elegant"
          >
            <Send className="h-16 w-16" />
          </Button>
        </form>
        
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}