import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = createTRPCRouter({
  // Create or get user (for simple auth)
  createUser: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.upsert({
          where: {
            email: input.email,
          },
          update: {
            name: input.name,
          },
          create: {
            email: input.email,
            name: input.name,
          },
        });
        return user;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create/get user',
        });
      }
    }),

  // Get user by email
  getUserByEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: {
          email: input.email,
        },
      });
      return user;
    }),
});