import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const prismaClientSingleton = () => {
  // Use Accelerate in production for connection pooling and edge caching
  // Make sure to set DATABASE_URL to your Prisma Accelerate connection string in production
  const client = new PrismaClient({
    log: ["error"],
  }).$extends(withAccelerate());
  
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