import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory data store
  let queue: any[] = [];
  let services = [
    { id: '1', name: 'চুল কাটা', price: 150 },
    { id: '2', name: 'চুল সহ দাড়ি', price: 220 },
    { id: '3', name: 'চুল স্পেশাল', price: 300 },
    { id: '4', name: 'দাড়ি স্পেশাল', price: 200 },
  ];

  // API Routes
  app.get("/api/queue", (req, res) => {
    res.json(queue);
  });

  app.post("/api/queue", (req, res) => {
    const customer = req.body;
    queue.push(customer);
    res.status(201).json(customer);
  });

  app.patch("/api/queue/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    queue = queue.map(c => c.id === id ? { ...c, ...updates } : c);
    res.json({ success: true });
  });

  app.delete("/api/queue/:id", (req, res) => {
    const { id } = req.params;
    queue = queue.filter(c => c.id !== id);
    res.json({ success: true });
  });

  app.get("/api/services", (req, res) => {
    res.json(services);
  });

  app.patch("/api/services/:id", (req, res) => {
    const { id } = req.params;
    const { price } = req.body;
    services = services.map(s => s.id === id ? { ...s, price } : s);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
