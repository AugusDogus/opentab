import { join } from "node:path";

const rootDir = import.meta.dirname;
const distDir = join(rootDir, "dist");
const publicDir = join(rootDir, "public");
const distPublicDir = join(distDir, "public");

// Recursively copy directory using Bun's file API
async function copyDir(src: string, dest: string) {
  await Bun.$`mkdir -p ${dest}`.quiet();
  const glob = new Bun.Glob("**/*");
  for await (const path of glob.scan({ cwd: src, dot: true })) {
    const srcPath = join(src, path);
    const destPath = join(dest, path);
    const file = Bun.file(srcPath);
    if (await file.exists()) {
      const destFile = Bun.file(destPath);
      await Bun.write(destFile, file);
    }
  }
}

// Read original public files before build (Bun bundler corrupts HTML files in place)
// https://github.com/oven-sh/bun/issues/20588
const originalFiles = new Map<string, ArrayBuffer>();
const glob = new Bun.Glob("**/*");
for await (const path of glob.scan({ cwd: publicDir, dot: true })) {
  const file = Bun.file(join(publicDir, path));
  if (await file.exists()) {
    originalFiles.set(path, await file.arrayBuffer());
  }
}

// Clean dist directory
await Bun.$`rm -rf ${distDir}`.quiet().nothrow();

// Copy public folder to dist/public first
await copyDir(publicDir, distPublicDir);

// Build with Bun
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: distDir,
  target: "bun",
  sourcemap: "linked",
  packages: "bundle",
  external: ["better-auth", "@better-auth/*", "hono", "@hono/*"],
});

// Restore original public files (Bun bundler corrupts them)
for (const [path, content] of originalFiles) {
  await Bun.write(join(publicDir, path), content);
}

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("Build successful!");
console.log(`Output: ${distDir}`);
