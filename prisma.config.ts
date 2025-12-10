// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  // Point Prisma CLI at your schema file
  schema: "prisma/schema.prisma",

  // Optional: if/when you add migrations, you can point to the folder here
  // migrations: {
  //   path: "prisma/migrations",
  // },

  // Datasource config (Prisma 7 style)
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
});
