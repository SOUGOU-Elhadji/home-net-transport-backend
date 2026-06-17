// backend/src/server.ts
import app from "./app";

const PORT = 3000;


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===================================================`);
    console.log(`🚀 HOME NET Transport Server Running on port: ${PORT}`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`===================================================`);
  });



