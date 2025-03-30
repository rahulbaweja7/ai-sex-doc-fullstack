// api/chat.js

import fs from "fs";
import path from "path";
import { transcribeAudio } from "../utils/transcribeAudio.js";
import { chatWithLLM } from "../utils/chatWithLLM.js";
import connectToMongo from "../utils/mongodb.js";
import Conversation from "../utils/models/Conversation.js";

// Connect to MongoDB once on cold start
connectToMongo();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  }

  try {
    const { metadata, audioBase64, userMessage } = req.body;

    // 💬 Handle text-based input
    if (userMessage) {
      const reply = await chatWithLLM(userMessage);
      return res.status(200).json({ success: true, reply });
    }

    // 🎙️ Handle audio-based input
    if (audioBase64 && metadata) {
      const buffer = Buffer.from(audioBase64, "base64");
      const tempFilePath = path.join("/tmp", `audio-${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, buffer);

      const transcript = await transcribeAudio(tempFilePath);
      const reply = await chatWithLLM(transcript);

      await Conversation.create({
        sessionId: metadata.sessionId,
        userId: metadata.userId,
        transcript,
        reply,
        timestamp: new Date(),
      });

      fs.unlink(tempFilePath, () => {});

      return res.status(200).json({
        success: true,
        reply,
        transcript,
      });
    }

    return res.status(400).json({ error: "Invalid request: missing userMessage or audioBase64 + metadata" });
  } catch (err) {
    console.error("🔥 Error in /api/chat:", err.stack || err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
