"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  messagesLoading?: boolean;
  className?: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading messages...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary mb-4">
      <Bot className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      Welcome to Your Career Coach
    </h3>
    <p className="text-muted-foreground max-w-md">
      I&apos;m here to help guide your career journey. Ask me about career paths,
      skill development, interview preparation, or any career-related questions.
    </p>
  </div>
);

// Markdown formatting functions
const processLinks = (text: string) => {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>'
  );
};

const processFormatting = (text: string) => {
  // Handle bold (**text**)
  text = text.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong style="font-weight: 600;">$1</strong>'
  );

  // Handle italic (*text*)
  text = text.replace(
    /\*([^*]+)\*/g,
    '<em style="font-style: italic;">$1</em>'
  );

  // Handle inline code (`text`)
  text = text.replace(
    /`([^`]+)`/g,
    '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">$1</code>'
  );

  // Process links
  text = processLinks(text);

  return text;
};

const formatCodeBlock = (content: string, language: string = "") => {
  return `<pre style="background-color: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; margin: 12px 0; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 0.9em;"><code>${content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</code></pre>`;
};

const formatMarkdown = (content: string) => {
  const lines = content.split("\n");
  let result = "";
  let inList = false;
  let listLevel = 0;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle code blocks
    if (trimmedLine.startsWith("```")) {
      if (!inCodeBlock) {
        // Starting a code block
        if (inList) {
          result += "</ul>";
          inList = false;
          listLevel = 0;
        }
        inCodeBlock = true;
        codeBlockLanguage = trimmedLine.substring(3);
        codeBlockContent = [];
      } else {
        // Ending a code block
        inCodeBlock = false;
        const codeContent = codeBlockContent.join("\n");
        result += formatCodeBlock(codeContent, codeBlockLanguage);
        codeBlockContent = [];
        codeBlockLanguage = "";
      }
      continue;
    }

    // If we're in a code block, collect content
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Skip empty lines
    if (!trimmedLine) {
      if (inList) {
        result += "</ul>";
        inList = false;
        listLevel = 0;
      }
      result += "<br>";
      continue;
    }

    // Handle markdown headings (## H2, ### H3, etc.)
    if (/^#{2,6}\s+/.test(trimmedLine)) {
      if (inList) {
        result += "</ul>";
        inList = false;
        listLevel = 0;
      }

      // Extract heading level and content
      const match = trimmedLine.match(/^(#{2,6})\s+(.*)/);
      if (match) {
        const hashes = match[1];
        const headingContent = match[2];
        const level = hashes.length; // 2 = h2, 3 = h3, etc.

        // Process links in heading content
        const processedContent = processLinks(headingContent);

        // Define styles based on heading level
        let fontSize, fontWeight, marginTop, marginBottom;

        switch (level) {
          case 2: // h2
            fontSize = "1.5em";
            fontWeight = "bold";
            marginTop = "24px";
            marginBottom = "12px";
            break;
          case 3: // h3
            fontSize = "1.3em";
            fontWeight = "600";
            marginTop = "20px";
            marginBottom = "10px";
            break;
          case 4: // h4
            fontSize = "1.1em";
            fontWeight = "600";
            marginTop = "16px";
            marginBottom = "8px";
            break;
          case 5: // h5
            fontSize = "1em";
            fontWeight = "600";
            marginTop = "12px";
            marginBottom = "6px";
            break;
          case 6: // h6
            fontSize = "0.9em";
            fontWeight = "600";
            marginTop = "10px";
            marginBottom = "4px";
            break;
          default:
            fontSize = "1em";
            fontWeight = "600";
            marginTop = "12px";
            marginBottom = "6px";
        }

        result += `<h${level} style="font-size: ${fontSize}; font-weight: ${fontWeight}; margin: ${marginTop} 0 ${marginBottom} 0; line-height: 1.2; text-align: left;">${processedContent}</h${level}>`;
      }
    } else if (/^\*\*.*\*\*$/.test(trimmedLine) && !trimmedLine.includes(":")) {
      if (inList) {
        result += "</ul>";
        inList = false;
        listLevel = 0;
      }

      // Extract title from ** wrapper
      const titleContent = trimmedLine.replace(/^\*\*(.*)\*\*$/, "$1");
      const processedTitle = processLinks(titleContent);
      result += `<h1 style="font-size: 1.6em; font-weight: bold; margin: 20px 0 15px 0; line-height: 1.2; text-align: left;">${processedTitle}</h1>`;
    }

    // Handle numbered sections with hierarchical styling
    else if (/^\d+\.\s+/.test(trimmedLine)) {
      if (inList) {
        result += "</ul>";
        inList = false;
        listLevel = 0;
      }

      const match = trimmedLine.match(/^(\d+\.\s+)(.*)/);
      if (match) {
        const number = match[1];
        const content = match[2];

        // Determine heading level based on number value - more subtle differences
        const numberValue = parseInt(number);
        let headingLevel, fontSize, fontWeight, marginTop, marginBottom;

        if (numberValue <= 3) {
          // Main numbered items (1-3) - slightly larger but not huge
          headingLevel = "h4";
          fontSize = "1em";
          fontWeight = "500";
          marginTop = "16px";
          marginBottom = "6px";
        } else {
          // Secondary numbered items (4-7)
          headingLevel = "h4";
          fontSize = "1em";
          fontWeight = "500";
          marginTop = "16px";
          marginBottom = "6px";
        }

        // Process ** formatting in the content - convert to <strong> tags
        const processedContent = processFormatting(content);

        result += `<${headingLevel} style="font-size: ${fontSize}; font-weight: ${fontWeight}; margin: ${marginTop} 0 ${marginBottom} 0; line-height: 1.3;">${number}${processedContent}</${headingLevel}>`;
      }
    }

    // Handle bullet points (both top-level and nested)
    else if (/^\s*\*\s+/.test(line)) {
      // Calculate indentation level
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
      const currentLevel = Math.floor(leadingSpaces / 4); // Assuming 4 spaces per indent level

      if (!inList) {
        result +=
          '<ul style="padding-left: 0; margin: 8px 0; list-style-position: outside;">';
        inList = true;
        listLevel = currentLevel;
      }

      const content = trimmedLine.replace(/^\s*\*\s+/, "");

      // Handle nested indentation with different bullet styles and styling
      let bulletStyle = "circle";
      let fontSize = "0.95em";
      let marginLeft = "20px";

      if (currentLevel > 0) {
        bulletStyle = "disc";
        fontSize = "0.9em";
        marginLeft = `${20 + currentLevel * 20}px`;
      }

      // Process bold formatting within content
      const processedContent = processFormatting(content);

      result += `<li style="display: list-item; list-style-type: ${bulletStyle}; margin-left: ${marginLeft}; margin-bottom: 4px; line-height: 1.4; font-size: ${fontSize};">${processedContent}</li>`;
    }

    // Handle regular paragraphs
    else {
      if (inList) {
        result += "</ul>";
        inList = false;
        listLevel = 0;
      }

      // Process bold and italic formatting
      const processedLine = processFormatting(trimmedLine);

      result += `<p style="margin: 8px 0; line-height: 1.5; font-size: 0.95em;">${processedLine}</p>`;
    }
  }

  // Handle any remaining code block at the end (unclosed)
  if (inCodeBlock) {
    const codeContent = codeBlockContent.join("\n");
    result += formatCodeBlock(codeContent, codeBlockLanguage);
  }

  // Close any remaining list
  if (inList) {
    result += "</ul>";
  }

  return result;
};

const TypingIndicator = () => (
  <div className="flex gap-4 p-4 rounded-xl bg-chat-ai-bubble mr-12 shadow-sm border">
    <Avatar className="h-8 w-8 flex-shrink-0">
      <AvatarFallback className="bg-muted text-muted-foreground">
        <Bot className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>

    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Career Coach</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
        <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
      </div>
    </div>
  </div>
);

export function ChatMessages({
  messages,
  isLoading,
  messagesLoading,
  className,
}: ChatMessagesProps) {
  const [bufferLoading, setBufferLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      setBufferLoading(false)
    }, 1000);
  }, [])
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea
      ref={scrollAreaRef}
      className={cn("flex-1 p-6 max-h-[calc(100vh-135px)]", className)}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {messagesLoading || bufferLoading ? (
          <LoadingSpinner />
        ) :  messages.length === 0  ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 p-4 rounded-xl",
                  message.role === "user"
                    ? "bg-[linear-gradient(135deg,hsl(258,89%,66%),hsl(258,89%,76%))] ml-12 shadow-sm"
                    : "bg-chat-ai-bubble mr-12 shadow-sm border"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback
                    className={cn(
                      message.role === "user"
                        ? "bg-violet-400 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div  className="flex-1 space-y-1 ">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${message.role === "user"?"text-gray-100":"text-gray-600"}`}>
                      {message.role === "user" ? "You" : "Career Coach"}
                    </span>
                  <span className={`text-xs ${message.role === "user"?"text-gray-300":"text-gray-400"}`}>
                      {message.timestamp}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-sm leading-relaxed",
                      message.role === "user"
                        ? "text-white"
                        : "text-chat-ai-text"
                    )}
                    dangerouslySetInnerHTML={{
                      __html:
                        message.role === "assistant"
                          ? formatMarkdown(message.content)
                          : processFormatting(message.content),
                    }}
                  />
                </div>
              </div>
            ))}

            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
