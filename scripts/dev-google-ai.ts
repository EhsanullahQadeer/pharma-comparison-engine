import { spawn } from "node:child_process";
import { env, exit } from "node:process";

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
  env: {
    ...env,
    GOOGLE_AI_CDP_URL: env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222",
  },
  stdio: "inherit",
});

child.on("exit", code => {
  exit(code ?? 0);
});
