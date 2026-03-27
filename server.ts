import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import * as ftp from "basic-ftp";
import Database from "better-sqlite3";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("gallery.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    src TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    event TEXT NOT NULL,
    height TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Multer setup for temporary storage
  const upload = multer({ dest: "uploads/" });

  // API: Get all photos
  app.get("/api/photos", (req, res) => {
    const photos = db.prepare("SELECT * FROM photos ORDER BY created_at DESC").all();
    res.json(photos);
  });

  // API: Upload photo to Hostinger via FTP
  app.post("/api/upload", upload.single("photo"), async (req, res) => {
    const { title, category, event, height } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        secure: false, // Set to true if Hostinger supports FTPS
      });

      const remoteFileName = `${Date.now()}-${file.originalname}`;
      const remotePath = path.join(process.env.FTP_REMOTE_PATH || "/", remoteFileName);

      await client.uploadFrom(file.path, remotePath);

      const imageUrl = `${process.env.IMAGE_BASE_URL}/${remoteFileName}`;

      // Save to SQLite
      db.prepare("INSERT INTO photos (src, title, category, event, height) VALUES (?, ?, ?, ?, ?)")
        .run(imageUrl, title, category, event, height);

      res.json({ success: true, url: imageUrl });
    } catch (err: any) {
      console.error("FTP Upload Error:", err);
      res.status(500).json({ error: "Failed to upload to Hostinger", details: err.message });
    } finally {
      client.close();
      // Cleanup temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  });

  // API: Delete photo
  app.delete("/api/photos/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM photos WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
