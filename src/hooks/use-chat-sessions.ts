'use client';

import { trpc } from '@/utils/trpc';

export function useChatSessions(userId: string | null) {
  const trpcUtils = trpc.useUtils();

  // Get chat sessions
  const {
    data: sessionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchSessions,
  } = trpc.chat.getSessions.useInfiniteQuery(
    {
      userId: userId!,
      limit: 20,
    },
    {
      enabled: !!userId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Create session mutation
  const createSessionMutation = trpc.chat.createSession.useMutation({
    onSuccess: () => {
      refetchSessions();
    },
  });

  // Update session title mutation - this will be called from backend
  const updateSessionTitleMutation = trpc.chat.updateSessionTitle.useMutation({
    onSuccess: () => {
      refetchSessions();
      // Also invalidate the sessions query to ensure fresh data
      trpcUtils.chat.getSessions.invalidate();
    },
  });

  // Delete session mutation
  const deleteSessionMutation = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      refetchSessions();
    },
  });

  const sessions = sessionsData?.pages.flatMap((page) => page.sessions) ?? [];

  const createSession = async (title: string) => {
    if (!userId) return;

    return await createSessionMutation.mutateAsync({
      title,
      userId,
    });
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    await updateSessionTitleMutation.mutateAsync({
      sessionId,
      title,
    });
  };

  const deleteSession = async (sessionId: string) => {
    await deleteSessionMutation.mutateAsync({
      sessionId,
    });
  };

  // Method to refresh sessions when title changes from backend
  const refreshSessions = () => {
    refetchSessions();
    trpcUtils.chat.getSessions.invalidate();
  };

  return {
    sessions,
    createSession,
    updateSessionTitle,
    deleteSession,
    refreshSessions,
    isCreating: createSessionMutation.isPending,
    isUpdating: updateSessionTitleMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
}