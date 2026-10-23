const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.UPLOAD_PASSWORD || "ADMIN6H";
const DATA_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "data");
const FILE_DIR = path.join(DATA_DIR, "files");
const META_PATH = path.join(DATA_DIR, "metadata.json");
const MAX_SIZE = 100 * 1024 * 1024;

fs.mkdirSync(FILE_DIR, { recursive: true });
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readMeta() {
  try {
    const value = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
    return { currentGrade: Number(value.currentGrade) || 6, files: Array.isArray(value.files) ? value.files : [] };
  } catch {
    return { currentGrade: Number(process.env.CURRENT_GRADE) || 6, files: [] };
  }
}
function writeMeta(meta) {
  const temp = META_PATH + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(meta, null, 2), "utf8");
  fs.renameSync(temp, META_PATH);
}
function cleanName(name) {
  return path.basename(String(name || "")).replace(/[\\u0000-\\u001f]/g, "").slice(0, 180) || "tai-lieu";
}
function adminOnly(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "Chủ website chưa đặt biến UPLOAD_PASSWORD trên Render." });
  if ((req.get("x-upload-password") || "") !== ADMIN_PASSWORD) return res.status(401).json({ error: "Mật khẩu quản trị không đúng." });
  next();
}
function safeFilePath(name) {
  const clean = cleanName(name);
  const full = path.resolve(FILE_DIR, clean);
  return full.startsWith(path.resolve(FILE_DIR) + path.sep) ? full : null;
}
function listFiles() {
  const meta = readMeta();
  return meta.files.filter(f => {
    const p = safeFilePath(f.storedName);
    return p && fs.existsSync(p) && fs.statSync(p).isFile();
  }).sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILE_DIR),
  filename: (_req, file, cb) => {
    const original = cleanName(Buffer.from(file.originalname, "latin1").toString("utf8"));
    const ext = path.extname(original).slice(0, 16);
    const stem = path.basename(original, path.extname(original)).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 110) || "tai-lieu";
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${stem}${ext}`;
    cb(null, unique);
  }
});
const allowedExt = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md|zip|rar|jpg|jpeg|png)$/i;
const upload = multer({
  storage, limits: { fileSize: MAX_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ok = allowedExt.test(file.originalname);
    cb(ok ? null : new Error("Định dạng chưa hỗ trợ. Dùng PDF, Word, PowerPoint, Excel, TXT, ZIP/RAR hoặc ảnh."), ok);
  }
});

app.get("/api/config", (_req, res) => {
  const meta = readMeta();
  res.json({ currentGrade: meta.currentGrade, copyright: "Nguyễn Như Phong" });
});
app.get("/api/files", (_req, res) => {
  const meta = readMeta();
  res.json({ currentGrade: meta.currentGrade, files: listFiles() });
});
app.post("/api/upload", adminOnly, (req, res, next) => {
  upload.array("files", 10)(req, res, err => {
    if (err) return next(err);
    if (!req.files || !req.files.length) return res.status(400).json({ error: "Bạn chưa chọn file." });
    const grade = Math.min(9, Math.max(6, Number(req.body.grade) || readMeta().currentGrade));
    const subject = String(req.body.subject || "Khác").trim().slice(0, 60) || "Khác";
    const description = String(req.body.description || "").trim().slice(0, 300);
    const meta = readMeta();
    const added = req.files.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
      name: cleanName(Buffer.from(f.originalname, "latin1").toString("utf8")),
      storedName: f.filename,
      size: f.size,
      grade,
      subject,
      description,
      uploadedAt: new Date().toISOString(),
      downloads: 0
    }));
    meta.files.push(...added);
    writeMeta(meta);
    res.json({ message: `Đã tải lên ${added.length} tài liệu cho lớp ${grade}.`, files: added });
  });
});
app.post("/api/settings/grade", adminOnly, (req, res) => {
  const grade = Number(req.body.grade);
  if (![6,7,8,9].includes(grade)) return res.status(400).json({ error: "Chỉ hỗ trợ lớp 6, 7, 8 và 9." });
  const meta = readMeta(); meta.currentGrade = grade; writeMeta(meta);
  res.json({ message: `Đã chuyển lớp hiện tại sang lớp ${grade}. Tài liệu các lớp trước vẫn được giữ nguyên.`, currentGrade: grade });
});
app.patch("/api/files/:id", adminOnly, (req, res) => {
  const meta = readMeta();
  const f = meta.files.find(x => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: "Không tìm thấy tài liệu." });
  if (req.body.grade !== undefined) {
    const g = Number(req.body.grade); if (![6,7,8,9].includes(g)) return res.status(400).json({error:"Lớp không hợp lệ."}); f.grade = g;
  }
  if (req.body.subject !== undefined) f.subject = String(req.body.subject).trim().slice(0,60) || "Khác";
  if (req.body.description !== undefined) f.description = String(req.body.description).trim().slice(0,300);
  writeMeta(meta); res.json({ message:"Đã cập nhật thông tin tài liệu.", file:f });
});
app.delete("/api/files/:id", adminOnly, (req, res) => {
  const meta = readMeta();
  const idx = meta.files.findIndex(x => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error:"Không tìm thấy tài liệu." });
  const [f] = meta.files.splice(idx,1);
  const p = safeFilePath(f.storedName);
  if (p && fs.existsSync(p)) fs.unlinkSync(p);
  writeMeta(meta); res.json({ message:"Đã xóa tài liệu." });
});
app.get("/api/download/:id", (req, res, next) => {
  const f = listFiles().find(x => x.id === req.params.id);
  if (!f) return res.status(404).send("Không tìm thấy tài liệu.");
  const p = safeFilePath(f.storedName);
  if (!p) return res.status(404).send("Không tìm thấy file.");
  const meta = readMeta();
  const row = meta.files.find(x => x.id === f.id);
  if (row) { row.downloads = (row.downloads || 0) + 1; writeMeta(meta); }
  res.download(p, f.name, err => { if (err && !res.headersSent) next(err); });
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File vượt quá giới hạn 100 MB." : (err.message || "Máy chủ gặp lỗi.") });
});
app.listen(PORT, () => console.log(`StudyShelf running on port ${PORT}`));