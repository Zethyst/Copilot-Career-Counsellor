"use client";

import { useState } from "react";
import { trpc } from "@/utils/trpc";

export function useChat(chatSessionId: string | null, userId: string | null) {
  const [isLoading, setIsLoading] = useState(false);

  // Get messages for a chat session
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages,
    isLoading: messagesLoading,
    isFetching: messagesFetching,
  } = trpc.chat.getMessages.useInfiniteQuery(
    {
      chatSessionId: chatSessionId!,
      limit: 50,
    },
    {
      enabled: !!chatSessionId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Create session mutation
  const createSessionMutation = trpc.chat.createSession.useMutation();

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
    onSettled: () => {
      // Reset loading state when mutation completes (success or error)
      setIsLoading(false);
    }
  });

  const messages = messagesData?.pages.flatMap((page) => page.messages) ?? [];

  const sendMessage = async (content: string, onSessionCreated?: (sessionId: string) => void) => {
    setIsLoading(true);

    try {
      let sessionId = chatSessionId;

      // Create a session if none exists
      if (!sessionId && userId) {
        const session = await createSessionMutation.mutateAsync({
          title: "New Conversation",
          userId,
        });
        sessionId = session.id;
        
        // Notify parent component about the new session
        if (onSessionCreated) {
          onSessionCreated(sessionId);
        }
      }

      if (!sessionId) {
        throw new Error("Unable to create or find a chat session");
      }

      const result = await sendMessageMutation.mutateAsync({
        chatSessionId: sessionId,
        content,
      });
      
      return result;
    } catch (error) {
      // Error handling is done in onSettled above
      throw error;
    }
  };

  return {
    messages,
    sendMessage,
    isLoading: isLoading || sendMessageMutation.isPending || createSessionMutation.isPending,
    messagesLoading: messagesLoading || messagesFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
}