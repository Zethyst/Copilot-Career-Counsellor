import { type NextApiRequest, type NextApiResponse } from 'next';
import { db } from './db';

export async function createTRPCContext({ req }: { req: Request }) {
  return {
    db,
    req,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
