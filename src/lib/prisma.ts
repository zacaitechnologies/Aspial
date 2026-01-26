import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // Direct connection to Supabase PostgreSQL
  // Make sure DATABASE_URL points to your Supabase direct connection string
  const client = new PrismaClient({
    log: ["error"],
  });
  
  return client;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  var prismaGlobal: undefined | PrismaClientSingleton;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };
export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
