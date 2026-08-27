import { spawnSync } from "node:child_process";
import { join } from "node:path";

const isWindows = process.platform === "win32";
const firebaseBin = join(process.cwd(), "node_modules", ".bin", isWindows ? "firebase.cmd" : "firebase");
const npmBin = isWindows ? "npm.cmd" : "npm";
const projectId = "demo-invoice-generator";
const env = {
  ...process.env,
  FIREBASE_PROJECT_ID: projectId,
  ALLOWED_FIREBASE_UID: "invoice-e2e-owner",
  NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "127.0.0.1",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:e2e",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "http://127.0.0.1:9099",
};

const result = spawnSync(
  firebaseBin,
  ["emulators:exec", "--only", "auth,firestore", "--project", projectId, `${npmBin} run test:e2e:direct`],
  { cwd: process.cwd(), env, stdio: "inherit", shell: isWindows },
);

process.exit(result.status ?? 1);
