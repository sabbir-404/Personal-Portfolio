import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as ftp from "basic-ftp";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Configure Multer for temporary storage
const upload = multer({ dest: "uploads/" });

// API: Upload to Hostinger via FTP
app.post("/api/upload", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false, // Set to true if your FTP supports FTPS
    });

    const remotePath = process.env.FTP_REMOTE_PATH || "/public_html/gallery";
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const remoteFilePath = path.join(remotePath, fileName);

    // Ensure the remote directory exists
    await client.ensureDir(remotePath);

    // Upload the file
    await client.uploadFrom(req.file.path, fileName);

    // Construct the public URL
    const imageBaseUrl = process.env.IMAGE_BASE_URL || "https://yourdomain.com/gallery";
    const publicUrl = `${imageBaseUrl}/${fileName}`;

    // Clean up local file
    fs.unlinkSync(req.file.path);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("FTP Upload Error:", err);
    res.status(500).json({ error: "Failed to upload to Hostinger via FTP" });
  } finally {
    client.close();
  }
});

// Vite middleware for development
async function startServer() {
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
