// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Detect GitHub Pages environment and set base accordingly.
// If you want to override the base manually, set VITE_BASE in an env file.
const getBase = () => {
  // During GitHub Actions the GITHUB_REPOSITORY env var is available (owner/repo)
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    // Use repository name as subpath: /repo-name/
    const repoName = repo.split("/").pop();
    return `/${repoName}/`;
  }
  // Allow manual override via VITE_BASE
  if (process.env.VITE_BASE) return process.env.VITE_BASE;
  // Default to root
  return "/";
};

export default defineConfig({
  vite: {
    base: getBase(),
  },
});
