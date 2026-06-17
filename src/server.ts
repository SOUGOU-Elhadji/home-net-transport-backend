// backend/src/server.ts
import app from "./app";
import path from "path";
import express from "express";
// import { execSync } from "child_process";

const PORT = 3000;

async function startServer() {
  // Ensure DB migration runs locally in SQLite first
  
  // try {
  //   console.log("Running local Prisma database migration sync...");
  //   // Let's execute prisma db push to ensure dev.db is synched without holding up the build in dry run
  //   // execSync("npx prisma db push --schema=backend/prisma/schema.prisma", { stdio: "inherit" });
  //   console.log("Prisma migration sync completed.");
  // } catch (err: any) {
  //   console.warn("Prisma sync warning (safely ignoring if DB is initialized):", err.message);
  // }

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite dev middleware...");
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.resolve(process.cwd(), "frontend") // target the decoupled frontend folder!
    });
    
    app.use(viteInstance.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode. Serving prebuilt static assets...");
    const distPath = path.resolve(process.cwd(), "frontend/dist");
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===================================================`);
    console.log(`🚀 HOME NET Transport Server Running on port: ${PORT}`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

startServer();
function createViteServer(arg0: {
  server: { middlewareMode: boolean; }; appType: string; root: string; // target the decoupled frontend folder!
}) {
  throw new Error("Function not implemented.");
}

