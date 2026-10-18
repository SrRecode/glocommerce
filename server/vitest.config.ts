import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// mongodb-memory-server derives its download dir from `INIT_CWD || cwd`, so a
// standalone run from `server/` and `npm --prefix server run test` from the repo
// root resolve different caches and re-download the ~600 MB mongod binary.
// Pin it to one absolute, cwd-independent path so every entry point shares it.
const mongoBinaryDir = fileURLToPath(
  new URL("./node_modules/.cache/mongodb-memory-server", import.meta.url),
);

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { NODE_ENV: "test", MONGOMS_DOWNLOAD_DIR: mongoBinaryDir },
    clearMocks: true,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
