import "server-only";

import { createDb, type AppDatabase } from "./client";

let appDb: AppDatabase | undefined;

export function getDb(): AppDatabase {
  appDb ??= createDb();
  return appDb;
}

export * from "./schema";
