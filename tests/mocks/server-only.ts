// server-only throws when it can't detect it's running inside Next.js's
// build system, which is true for any plain Node/Vitest run — this stub
// makes `import "server-only"` a no-op under tests. Test files never run
// in a browser, so the guarantee that package exists for (never let
// server code leak into a client bundle) isn't relevant here anyway.
export {};
