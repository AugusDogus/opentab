#!/usr/bin/env bun

/**
 * Plasmo + Tailwind v4 Compatibility Patch
 *
 * Automatically fixes "node:" import issues in jiti and @tailwindcss/oxide
 * that cause Plasmo builds to fail when using Tailwind CSS v4.
 *
 * @see https://github.com/PlasmoHQ/plasmo/issues/1188
 */

import { existsSync, readdirSync } from "fs";
import { join, relative, resolve } from "path";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

type Color = keyof typeof colors;

const log = (msg: string, color: Color = "reset") =>
  console.log(`${colors[color]}${msg}${colors.reset}`);

/**
 * Recursively find files matching a pattern
 */
const findFiles = (
  dir: string,
  pattern: RegExp,
  results: string[] = []
): string[] => {
  if (!existsSync(dir)) return results;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        findFiles(fullPath, pattern, results);
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }
  return results;
};

/**
 * Find all files that might need patching
 */
const findPackageFiles = (): string[] => {
  // Start from the monorepo root (two levels up from extension/scripts)
  const monorepoRoot = resolve(import.meta.dirname, "..", "..", "..");
  const nodeModules = join(monorepoRoot, "node_modules");

  if (!existsSync(nodeModules)) {
    log(`⚠️  node_modules not found at: ${nodeModules}`, "yellow");
    return [];
  }

  const files: string[] = [];

  // Search in specific known locations
  const searchPaths = [
    join(nodeModules, "jiti"),
    join(nodeModules, "@tailwindcss"),
  ];

  for (const searchPath of searchPaths) {
    if (existsSync(searchPath)) {
      const found = findFiles(searchPath, /\.(c|m)?js$/);
      files.push(...found);
    }
  }

  return [...new Set(files)];
};

interface PatchResult {
  patched: boolean;
  skipped: boolean;
  error?: boolean;
}

/**
 * Patch a single file using Bun's file API
 */
const patchFile = async (filePath: string): Promise<PatchResult> => {
  try {
    const content = await Bun.file(filePath).text();
    const hasNodeImports =
      content.includes('require("node:') || content.includes("require('node:");

    if (!hasNodeImports) {
      return { patched: false, skipped: true };
    }

    const patched = content
      .replace(/require\("node:([^"]+)"\)/g, 'require("$1")')
      .replace(/require\('node:([^']+)'\)/g, "require('$1')");

    await Bun.write(filePath, patched);
    return { patched: true, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`❌ Error patching ${filePath}: ${message}`, "red");
    return { patched: false, skipped: false, error: true };
  }
};

log("🔧 Plasmo + Tailwind v4 compatibility patch", "cyan");
log("   Removing node: prefixes from imports...", "blue");

const files = findPackageFiles();

if (files.length === 0) {
  log("⚠️  No files found to check", "yellow");
  process.exit(0);
}

let patchedCount = 0;

const results = await Promise.all(files.map(patchFile));

for (let i = 0; i < files.length; i++) {
  const result = results[i];
  if (result.patched) {
    patchedCount++;
    log(`✅ Patched: ${relative(process.cwd(), files[i])}`, "green");
  }
}

log("", "reset");
if (patchedCount > 0) {
  log(`🎉 Patched ${patchedCount} files`, "green");
} else {
  log("✅ All files already patched or no patches needed", "green");
}
