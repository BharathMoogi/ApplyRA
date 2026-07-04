import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazy-initialized Prisma Client wrapper using a Proxy.
 * Prevents instantiation during the Next.js build/static-site generation phase,
 * avoiding connection/adapter validation failures when database drivers are not active.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
      globalForPrisma.prisma = new PrismaClient({ adapter });
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
