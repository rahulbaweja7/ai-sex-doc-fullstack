// api/chat.js

import fs from "fs";
import path from "path";
import { transcribeAudio } from "../utils/transcribeAudio.js";
import { chatWithLLM } from "../utils/chatWithLLM.js";
import connectToMongo from "../utils/mongodb.js";
import Conversation from "../utils/models/Conversation.js";


connectToMongo();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  }

  try {
    const { metadata, audioBase64 } = req.body;

    if (!audioBase64 || !metadata) {
      return res.status(400).json({ error: "Missing audio or metadata" });
    }

    // Decode the base64 string and save to temp file
    const buffer = Buffer.from(audioBase64, "base64");
    const tempFilePath = path.join("/tmp", `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, buffer);

    // 1. Transcribe audio
    const transcript = await transcribeAudio(tempFilePath);

    // 2. Get LLM response
    const reply = await chatWithLLM(transcript);

    // 3. Store in Mongo
    await Conversation.create({
      sessionId: metadata.sessionId,
      userId: metadata.userId,
      transcript,
      reply,
      timestamp: new Date(),
    });

    // 4. Cleanup
    fs.unlink(tempFilePath, () => {});

    // 5. Respond
    return res.status(200).json({
      success: true,
      reply,
      transcript,
    });
  } catch (err) {
    console.error("🔥 Error in /api/chat:", err.stack || err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
