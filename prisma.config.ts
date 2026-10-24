import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const isPostgres =
  databaseUrl.startsWith("postgres://") ||
  databaseUrl.startsWith("postgresql://");

export default defineConfig({
  schema: isPostgres
    ? "prisma/schema.postgres.prisma"
    : "prisma/schema.prisma",
  migrations: {
    path: isPostgres
      ? "prisma/migrations/postgresql"
      : "prisma/migrations/sqlite",
  },
  datasource: {
    url: databaseUrl,
  },
});
