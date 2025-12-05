app.get("/", (req, res) => {
  res.send("API is running");
});

// picture_trance_server.cjs
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- ディレクトリ設定 ---
const OUTPUT_DIR = path.join(__dirname, "outputs");
const PICS_DIR = path.join(OUTPUT_DIR, "pictures");
const JSONS_DIR = path.join(OUTPUT_DIR, "jsons");

// フォルダがなければ作成 (再帰的に作成可能)
[PICS_DIR, JSONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- Multer設定 (画像を outputs/pictures に保存) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PICS_DIR),
  filename: (req, file, cb) => {
    // ファイル名でペアにするため、タイムスタンプ付きの固定名を作成
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

// 画像を受け取ってIDを返すだけのルート (必要であれば)
app.post("/parse-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no image uploaded" });
  const filename = req.file.filename;
  const id = path.parse(filename).name;
  return res.json({ id, filename });
});

/**
 * /transcribe-image
 * 画像をGeminiへ送り、レシート情報を抽出。
 * 成功時のみ JSONファイルを outputs/jsons に保存する。
 */
app.post("/transcribe-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no image uploaded" });

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(400).json({ error: "missing GOOGLE_API_KEY" });
  }

  const filepath = req.file.path; // outputs/pictures/xxx.png
  const filename = req.file.filename; // xxx.png
  
  try {
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const imageBytes = fs.readFileSync(filepath);
    const b64 = imageBytes.toString("base64");
    const mime = req.file.mimetype || "image/png";

    // プロンプト (項目追加済み)
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
      '      "price": number|null       // 商品価格 (小計)\n' +
      '    }\n' +
      '  ],\n' +
      '  "total": number|null       // 合計請求金額\n' +
      "}\n\n" +
      "見つからない項目は null にしてください。出力は余分な説明を含めず、純粋に JSON のみを返してください。";

    const contents = [
      {
        role: "user",
        parts: [
          { text: promptText },
          { inlineData: { mimeType: mime, data: b64 } }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro", 
      contents
    });

    const text =
      response?.text ||
      response?.output?.[0]?.content?.map(c => c?.text || "").join("\n") ||
      JSON.stringify(response);

    // JSONパース処理
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

    // パース成功時のみファイルに保存
    if (parsed) {
      // 拡張子を .json に変えて保存
      const jsonFileName = path.parse(filename).name + ".json";
      const jsonPath = path.join(JSONS_DIR, jsonFileName);
      
      fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2), "utf8");
      console.log(`Saved JSON to: ${jsonPath}`);

      return res.json({ source: "genai", text, parsed, saved: true });
    } else {
      // パース失敗時はJSONファイルを出力しない
      return res.status(502).json({
        error: "genai_unparsable",
        detail: { text, rawResponse: response },
        saved: false
      });
    }

  } catch (err) {
    console.error("GenAI error:", err);
    // エラーハンドリング (画像は残りますがJSONは書き込まれません)
    const detail = {
      message: err.message,
      code: err.code || null,
      response: err.response
        ? { status: err.response.status, data: err.response.data }
        : null
    };
    return res.status(500).json({ error: "genai_failed", detail });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`picture_trance_server listening on ${PORT}`));