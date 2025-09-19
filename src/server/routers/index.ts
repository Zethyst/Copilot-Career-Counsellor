import { createTRPCRouter } from '../trpc';
import { chatRouter } from './chat';
import { userRouter } from './user';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;