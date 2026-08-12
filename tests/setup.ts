import { config } from "dotenv";
import path from "path";

// Local dev runs against .env.local; CI supplies the same vars as real
// environment variables (see .github/workflows/test.yml), so this is a
// no-op there — dotenv never overrides an already-set variable.
config({ path: path.resolve(__dirname, "../.env.local") });
