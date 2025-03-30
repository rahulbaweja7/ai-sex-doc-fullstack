// backend/api/chat.js

import multer from "multer";
import fs from "fs";
import nextConnect from "next-connect";
import { transcribeAudio } from "../../utils/transcribeAudio.js";
import { chatWithLLM } from "../../utils/chatWithLLM.js";
import connectToMongo from "../../utils/mongodb.js";
import Conversation from "../../utils/models/Conversation.js";

connectToMongo();

const upload = multer({ dest: "uploads/" });

const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error("API Route Error:", error);
    res.status(501).json({ error: `Sorry something happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single("audio"));

apiRoute.post(async (req, res) => {
  try {
    const metadata = JSON.parse(req.body.metadata);
    const audioFile = req.file;

    if (!audioFile || !metadata) {
      return res.status(400).json({ error: "Missing audio or metadata" });
    }

    const transcript = await transcribeAudio(audioFile.path);
    const reply = await chatWithLLM(transcript);

    await Conversation.create({
      sessionId: metadata.sessionId,
      userId: metadata.userId,
      transcript,
      reply,
      timestamp: new Date(),
    });

    fs.unlink(audioFile.path, () => {}); // delete temp file

    res.json({
      success: true,
      reply,
      transcript,
    });
  } catch (err) {
    console.error("🔥 Error in /api/chat:", err.stack || err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default apiRoute;
export const config = {
  api: {
    bodyParser: false,
  },
};
