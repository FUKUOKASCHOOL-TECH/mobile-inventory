// picture_trance_server.js
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

app.post("/parse-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no image uploaded" });
  const filename = req.file.filename;
  const id = path.parse(filename).name || "item_from_image";
  return res.json({ id, filename });
});

/**
 * /transcribe-image
 * 受け取った画像をそのまま Gemini（@google/genai）へ送り、
 * レシート情報を JSON 形式で抽出して返す。
 *
 * 要: 環境変数 GOOGLE_API_KEY が設定されていること（または GOOGLE_APPLICATION_CREDENTIALS）
 */
app.post("/transcribe-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no image uploaded" });

  if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return res.status(400).json({ error: "missing GOOGLE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS" });
  }

  const filepath = req.file.path;
  try {
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const imageBytes = fs.readFileSync(filepath);
    const b64 = imageBytes.toString("base64");
    const mime = req.file.mimetype || "image/png";

    const promptText =
      "この画像はレシートの写真です。画像から次の項目を抽出して、必ずJSONで返してください。" +
      " 返却するJSONスキーマ:\n" +
      "{\n" +
      '  "store": string|null,\n' +
      '  "date": string|null,\n' +
      '  "total": number|null,\n' +
      '  "currency": string|null,\n' +
      '  "items": [ { "name": string|null, "price": number|null } ]\n' +
      "}\n\n" +
      "見つからない項目は null にしてください。出力は余分な説明を含めず、純粋に JSON のみを返してください。";

    // GenAI に送る contents（画像パートに data を明示）
    const contents = [
      {
        parts: [
          { type: "input_text", text: promptText },
          { type: "input_image", data: { image: { mime_type: mime, b64 } } }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents
    });

    // SDKの戻り値からテキスト抽出（互換性を持たせる）
    const text =
      response?.text ||
      response?.output?.[0]?.content?.map(c => c?.text || "").join("\n") ||
      JSON.stringify(response);

    // テキストからJSON部分を抜き出してパース
    let parsed = null;
    try {
      const first = text.indexOf("{");
      const last = text.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        const jsonStr = text.slice(first, last + 1);
        parsed = JSON.parse(jsonStr);
      } else {
        parsed = JSON.parse(text);
      }
    } catch (e) {
      parsed = null;
    }

    if (parsed) {
      return res.json({ source: "genai", text, parsed });
    } else {
      // GenAI は成功したが JSON 抽出に失敗した場合の情報返却
      return res.status(502).json({
        error: "genai_unparsable",
        detail: { text, rawResponse: response }
      });
    }
  } catch (err) {
    console.error("GenAI error:", err);
    const detail = {
      message: err.message,
      code: err.code || null,
      response: err.response
        ? {
            status: err.response.status,
            data: err.response.data || err.response.body || null
          }
        : null,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
    };
    return res.status(500).json({ error: "genai_failed", detail });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`picture_trance_server listening on ${PORT}`));