import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse requests
  app.use(express.json());

  // API endpoint for AI Task Summary
  app.post("/api/tasks/ai-summary", async (req, res) => {
    try {
      const { tasks, userEmail, userName, userPosition, todaySessionsFormatted } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not defined. Please add it in your Settings > Secrets panel."
        });
      }

      // Lazy initialization of GoogleGenAI client on-demand
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const todaySessions = todaySessionsFormatted || [];
      const currentTasks = tasks || [];
      const totalCount = todaySessions.length + currentTasks.length;

      // Clean prompt instruction to fulfill instructions
      const prompt = `You are the AI Training Coordinator assistant at the Petrovietnam - Safety & Environment Training Centre (SETC). 
We have below the real-time daily agenda for user "${userName}" (${userPosition}):

- User Email: ${userEmail}
- Date: 2026-06-08 (today)
- Assigned Course Sessions Today:
${JSON.stringify(todaySessions, null, 2)}
- Direct tasks Assigned:
${JSON.stringify(currentTasks, null, 2)}

You MUST write a concise, elegant, and perfectly structured summary of the user's tasks today.
Follow these rules ABSOLUTELY:
1. First line must report the total number of tasks as:
"You have ${totalCount} tasks today:"

2. Then list the items under these formats as numbered or bulleted list:
   - For sessions where the user's role is "instructor", output format:
     "Teach [courseCode] at room [classroom] at [duration hours]"
   - For sessions where the user's role is "ta" or "tg", output format:
     "TA/TG [courseCode] at room [classroom] at [duration hours]"
   - For other direct tasks that are pending or active, output a short actionable bullet under the center safety context.

Please substitute:
- [courseCode] with the actual course code (e.g. OPITO-BOSIET)
- [classroom] with the actual room name (e.g. Classroom 102)
- [duration hours] with the session's duration or time, e.g., 08:00 - 12:00 or similar hours range.

Use bold markdown (e.g., **Teach OPITO-BOSIET** or **room 101**) to highlight course codes and classrooms so they stand out in high contrast.
Do not add dry or generic preambles or concluding chat like "Certainly! Here is your summary". Start directly with "You have ${totalCount} tasks today:" and then the concise list.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ summary: response.text || "No summary available." });
    } catch (err: any) {
      console.error("Gemini AI task summary error:", err);
      res.status(500).json({ error: err.message || "An error occurred with Gemini." });
    }
  });

  // Serve static assets OR use Vite Dev Server
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
    console.log(`[SETC Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
