import { defineConfig } from "bumpp";

export default defineConfig({
  files: ["apps/extension/package.json", "apps/native/package.json"],
  commit: "chore: release v%s",
  tag: "v%s",
  push: true,
});

