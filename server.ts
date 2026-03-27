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

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Multer for temporary storage
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// API: Upload to Hostinger via FTP
app.post("/api/upload", upload.single("photo"), async (req, res) => {
  console.log("Upload request received");
  if (!req.file) {
    console.log("No file in request");
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("File received:", req.file.originalname);
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    let ftpHost = process.env.FTP_HOST || "";
    const isSecure = /^ftps:\/\//i.test(ftpHost);
    // Remove ftp:// or ftps:// prefixes if present
    ftpHost = ftpHost.replace(/^ftps?:\/\//i, "");
    
    const ftpUser = (process.env.FTP_USER || "").trim();
    const ftpPassword = (process.env.FTP_PASSWORD || "").trim();
    
    if (!ftpUser || !ftpPassword) {
      console.error("Missing FTP credentials in environment variables");
      return res.status(500).json({ 
        error: "FTP credentials (FTP_USER or FTP_PASSWORD) are missing in the Secrets panel.",
        details: "Please add them in Settings > Secrets."
      });
    }
    
    console.log(`Attempting FTP connection to ${ftpHost} with user ${ftpUser.substring(0, 5)}...`);
    await client.access({
      host: ftpHost,
      user: ftpUser,
      password: ftpPassword,
      secure: isSecure,
    });

    const remotePath = process.env.FTP_REMOTE_PATH || "/public_html/gallery";
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
    
    console.log("Ensuring remote dir:", remotePath);
    await client.ensureDir(remotePath);

    console.log("Uploading file to:", fileName);
    await client.uploadFrom(req.file.path, fileName);

    const imageBaseUrl = process.env.IMAGE_BASE_URL || "https://yourdomain.com/gallery";
    const publicUrl = imageBaseUrl.endsWith("/") 
      ? `${imageBaseUrl}${fileName}` 
      : `${imageBaseUrl}/${fileName}`;

    console.log("Upload successful, public URL:", publicUrl);

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error("FTP Upload Error:", err);
    let errorMessage = "Failed to upload to Hostinger via FTP";
    let details = err instanceof Error ? err.message : String(err);

    if (details.includes("530")) {
      errorMessage = "FTP Login Failed: Please check your FTP_USER and FTP_PASSWORD in the Secrets panel.";
    }

    res.status(500).json({ 
      error: errorMessage,
      details: details
    });
  } finally {
    client.close();
  }
});

// Error handling middleware to ensure JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    details: err.message || String(err) 
  });
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
