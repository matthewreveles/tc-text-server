// src/prisma.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment (src/prisma.ts)");
}
// Debug: show exactly what Prisma will use
console.log("[tc-text-server] Prisma DATABASE_URL =", connectionString);
// Create a shared PG pool for Prisma's client engine
const pool = new Pool({
    connectionString,
    max: 10, // reasonable default
});
// Wire Prisma to Postgres via adapter-pg
const adapter = new PrismaPg(pool);
const globalForPrisma = globalThis;
const prismaClientSingleton = globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV !== "production" ? ["warn", "error"] : ["error"],
    });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClientSingleton;
}
export const prisma = prismaClientSingleton;
export default prisma;
