import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
  
  // Handle connection pooling in production
  if (process.env.NODE_ENV === "production") {
    // Set connection pool timeout
    client.$connect().catch((err) => {
      console.error("Failed to connect to database:", err);
    });
  }
  
  return client;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };
export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;