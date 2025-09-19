import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatRouter = createTRPCRouter({
  // Create a new chat session
  createSession: publicProcedure
    .input(z.object({
      title: z.string().min(1).max(100),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const chatSession = await ctx.db.chatSession.create({
          data: {
            title: input.title,
            userId: input.userId,
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            _count: {
              select: {
                messages: true,
              },
            },
          },
        });
        return chatSession;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create chat session',
        });
      }
    }),

  // Get all chat sessions for a user
  getSessions: publicProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.db.chatSession.findMany({
        where: {
          userId: input.userId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              content: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (sessions.length > input.limit) {
        const nextItem = sessions.pop();
        nextCursor = nextItem!.id;
      }

      // Transform sessions to match your component interface
      const transformedSessions = sessions.map((session:any) => ({
        id: session.id,
        title: session.title,
        lastMessage: session.messages[0]?.content || 'No messages yet',
        timestamp: formatTimestamp(session.messages[0]?.createdAt || session.updatedAt),
        isActive: session.isActive,
        _count: session._count,
      }));

      return {
        sessions: transformedSessions,
        nextCursor,
      };
    }),

  // Get messages for a specific chat session
  getMessages: publicProcedure
    .input(z.object({
      chatSessionId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const messages = await ctx.db.message.findMany({
        where: {
          chatSessionId: input.chatSessionId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          content: true,
          role: true,
          createdAt: true,
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      // Transform messages to match your component interface
      const transformedMessages = messages.map((message:any) => ({
        id: message.id,
        content: message.content,
        role: message.role.toLowerCase() as 'user' | 'assistant',
        timestamp: formatTimestamp(message.createdAt),
      }));

      return {
        messages: transformedMessages,
        nextCursor,
      };
    }),

  // Send a message and get AI response
  sendMessage: publicProcedure
    .input(z.object({
      chatSessionId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create user message
        const userMessage = await ctx.db.message.create({
          data: {
            content: input.content,
            role: 'USER',
            chatSessionId: input.chatSessionId,
          },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        });

        // Get chat history for context
        const previousMessages = await ctx.db.message.findMany({
          where: {
            chatSessionId: input.chatSessionId,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 20, // Last 20 messages for context
          select: {
            content: true,
            role: true,
          },
        });

        // Call OpenAI API
        const aiResponse = await getOpenAIResponse(previousMessages, input.content);

        // Create AI message
        const aiMessage = await ctx.db.message.create({
          data: {
            content: aiResponse,
            role: 'ASSISTANT',
            chatSessionId: input.chatSessionId,
          },
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        });

        // Update session updatedAt and generate title if it's the first message
        const session = await ctx.db.chatSession.findUnique({
          where: { id: input.chatSessionId },
          select: { title: true, _count: { select: { messages: true } } },
        });

        const updateData: any = { updatedAt: new Date() };
        
        // Auto-generate title for new conversations
        if (session && (session.title === 'New Conversation' || session.title === 'New Chat') && session._count.messages <= 5) {
          const title = await generateChatTitle(input.content);
          updateData.title = title;
        }

        await ctx.db.chatSession.update({
          where: { id: input.chatSessionId },
          data: updateData,
        });

        return {
          userMessage: {
            id: userMessage.id,
            content: userMessage.content,
            role: userMessage.role.toLowerCase() as 'user' | 'assistant',
            timestamp: formatTimestamp(userMessage.createdAt),
          },
          aiMessage: {
            id: aiMessage.id,
            content: aiMessage.content,
            role: aiMessage.role.toLowerCase() as 'user' | 'assistant',
            timestamp: formatTimestamp(aiMessage.createdAt),
          },
        };
      } catch (error) {
        console.error('Send message error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message',
        });
      }
    }),

  // Update chat session title
  updateSessionTitle: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      title: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedSession = await ctx.db.chatSession.update({
          where: {
            id: input.sessionId,
          },
          data: {
            title: input.title,
          },
        });
        return updatedSession;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update session title',
        });
      }
    }),

  // Delete a chat session
  deleteSession: publicProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.chatSession.delete({
          where: {
            id: input.sessionId,
          },
        });
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete session',
        });
      }
    }),
});

// OpenAI Response function
async function getOpenAIResponse(previousMessages: any[], currentMessage: string): Promise<string> {
  try {
    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert career counselor and professional development coach with over 15 years of experience helping people navigate their career journeys. Your expertise includes:

- Career transitions and pivots
- Skills assessment and development planning  
- Interview preparation and negotiation strategies
- Resume and LinkedIn optimization
- Industry insights and job market trends
- Work-life balance and professional growth
- Leadership development and management skills
- Networking and personal branding

Your approach is:
- Empathetic and supportive, yet practical and actionable
- Personalized to each individual's unique situation and goals
- Evidence-based, drawing from current industry best practices
- Encouraging while being realistic about challenges and timeframes

Always ask clarifying questions to better understand the person's situation, goals, and constraints. Provide specific, actionable advice with concrete next steps. When appropriate, suggest resources, tools, or strategies that can help them achieve their career objectives.

Remember to be encouraging and positive while acknowledging the real challenges people face in their careers. Your goal is to empower them to make informed decisions and take meaningful action toward their professional goals.`,
      },
      ...previousMessages.map((msg) => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: currentMessage,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for cost efficiency
      messages: messages,
      max_tokens: 1500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    return response.choices[0]?.message?.content || 
      "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      return "I'm sorry, but there's an issue with the AI service configuration. Please contact support.";
    }
    
    return "I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, and if the problem persists, feel free to rephrase your question.";
  }
}

// Generate chat title from first message
async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title (max 50 characters) for a career counseling conversation based on the user\'s first message. Focus on the main topic or career concern.',
        },
        {
          role: 'user',
          content: firstMessage,
        },
      ],
      max_tokens: 50,
      temperature: 0.5,
    });

    const title = response.choices[0]?.message?.content?.trim();
    return title && title.length <= 50 ? title : 'Career Discussion';
  } catch (error) {
    console.error('Title generation error:', error);
    return 'Career Discussion';
  }
}

// Helper function to format timestamps
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}