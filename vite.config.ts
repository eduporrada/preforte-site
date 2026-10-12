import vinext from "vinext";
import { defineConfig } from "vite";

// Roda em Node na VPS. O banco e os arquivos vêm de db/env.ts.
export default defineConfig({
  plugins: [vinext()],
});
