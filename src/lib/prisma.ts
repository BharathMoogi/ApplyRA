import { PrismaClient } from "@/generated/prisma/client";

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
      globalForPrisma.prisma = new PrismaClient({
        adapter: null as any,
      });
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
