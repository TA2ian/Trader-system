import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Client Initialization
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = geminiApiKey ? new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Syria Trader ERP Server is running" });
  });

  app.post("/api/ai/analyze", async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: "AI Service not configured" });
    }

    const { type, data } = req.body;
    
    try {
      let prompt = "";
      if (type === "health") {
        prompt = `قمت بتحليل البيانات المالية التالية لتجار في سوريا: ${JSON.stringify(data)}. 
        يرجى تقديم تقرير مختصر باللغة العربية حول الالتزامات والسيولة وتوصيات لتحسين الأداء. 
        تحدث بلهجة احترافية وواقعية تناسب السوق السوري.`;
      } else {
        prompt = `حلل هذا الطلب: ${JSON.stringify(data)}. قدم نصيحة تجارية باللغة العربية.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ parts: [{ text: prompt }] }],
      });

      if (!response.text) {
        throw new Error("No text returned from Gemini");
      }

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message || "Failed to process AI request" });
    }
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
