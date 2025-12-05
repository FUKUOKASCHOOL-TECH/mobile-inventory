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

app.post("/parse-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no image uploaded" });
  const filename = req.file.filename;
  const id = path.parse(filename).name || "item_from_image";
  // TODO: ここで画像解析を行う（必要なら py/外部サービスを呼ぶ）
  return res.json({ id, filename });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`picture_trance_server listening on ${PORT}`));