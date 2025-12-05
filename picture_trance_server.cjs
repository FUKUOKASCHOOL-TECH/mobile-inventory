// picture_trance_server.cjs
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
 */
app.post("/transcribe-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no image uploaded" });

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(400).json({ error: "missing GOOGLE_API_KEY" });
  }

  const filepath = req.file.path;
  try {
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const imageBytes = fs.readFileSync(filepath);
    
    const b64 = imageBytes.toString("base64");
    const mime = req.file.mimetype || "image/png";

    // ▼▼▼ プロンプト変更箇所 ▼▼▼
    const promptText =
      "この画像はレシートの写真です。画像から次の項目を抽出して、必ずJSONで返してください。" +
      " 返却するJSONスキーマ:\n" +
      "{\n" +
      '  "store": string|null,      // 購入店舗名\n' +
      '  "tel": string|null,        // 電話番号\n' +
      '  "date": string|null,       // 購入日 (YYYY-MM-DD)\n' +
      '  "time": string|null,       // 購入時間 (HH:MM)\n' +
      '  "items": [\n' +
      '    {\n' +
      '      "name": string|null,       // 商品名\n' +
      '      "unit_price": number|null, // 商品単価\n' +
      '      "quantity": number|null,   // 商品購入数\n' +
      '      "price": number|null       // 商品価格 (小計: 単価×数量の金額)\n' +
      '    }\n' +
      '  ],\n' +
      '  "total": number|null       // 合計請求金額\n' +
      "}\n\n" +
      "見つからない項目は null にしてください。出力は余分な説明を含めず、純粋に JSON のみを返してください。";
    // ▲▲▲ プロンプト変更箇所終わり ▲▲▲

    const contents = [
      {
        role: "user",
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mime,
              data: b64
            }
          }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", // エラー回避のため安定版を使用
      contents
    });

    // SDKの戻り値からテキスト抽出
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
        : null
    };
    return res.status(500).json({ error: "genai_failed", detail });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`picture_trance_server listening on ${PORT}`));