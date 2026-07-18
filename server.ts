import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import * as ftp from "basic-ftp";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
const PORT = 3000;

// --- PostgreSQL Connection Pool ---
const pool = new pg.Pool({
  host: process.env.PG_HOST || "100.88.85.6",
  port: parseInt(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER || "admin",
  password: process.env.PG_PASSWORD || "Brown@8099",
  database: process.env.PG_DATABASE || "portfolio",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

// --- JWT Helpers (using Node.js crypto, no external dependency) ---
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRY_HOURS = 24;

interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

function createJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY_HOURS * 3600,
  };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload: JWTPayload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// --- Password Hashing (Node.js built-in scrypt) ---
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ":" + derivedKey.toString("hex"));
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

// --- Auth Middleware ---
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  (req as any).user = payload;
  next();
}

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Multer for temporary storage
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ========================================
// API: Health Check
// ========================================
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db: "connected", time: result.rows[0].now });
  } catch (err: any) {
    res.json({ status: "ok", db: "error", error: err.message });
  }
});

// ========================================
// API: Authentication
// ========================================
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM admin_users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createJWT({ userId: user.id, email: user.email });
    res.json({ token, email: user.email });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

app.get("/api/auth/verify", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ valid: true, email: user.email });
});

// ========================================
// API: Settings (developer, photography)
// ========================================
app.get("/api/settings/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM settings WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.json({});
    }
    res.json(result.rows[0].data);
  } catch (err: any) {
    console.error("Settings fetch error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put("/api/settings/:id", requireAuth, async (req, res) => {
  try {
    const data = req.body;
    await pool.query(
      `INSERT INTO settings (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.params.id, JSON.stringify(data)]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error("Settings save error:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ========================================
// API: Developer Projects
// ========================================
app.get("/api/dev-projects", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM dev_projects ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Dev projects fetch error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.post("/api/dev-projects", requireAuth, async (req, res) => {
  const { title, subtitle, category, description, tech, repo_url, live_url, thumbnail } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO dev_projects (title, subtitle, category, description, tech, repo_url, live_url, thumbnail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, subtitle, category || "Web Development", description, tech, repo_url, live_url, thumbnail]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Project create error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.delete("/api/dev-projects/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM dev_projects WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Project delete error:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// ========================================
// API: Awards
// ========================================
app.get("/api/awards", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM awards ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    console.error("Awards fetch error:", err);
    res.status(500).json({ error: "Failed to fetch awards" });
  }
});

app.post("/api/awards", requireAuth, async (req, res) => {
  const { year, title, org, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO awards (year, title, org, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [year, title, org, description]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Award create error:", err);
    res.status(500).json({ error: "Failed to create award" });
  }
});

app.delete("/api/awards/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM awards WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Award delete error:", err);
    res.status(500).json({ error: "Failed to delete award" });
  }
});

// ========================================
// API: Featured Showcase
// ========================================
app.get("/api/featured-showcase", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM featured_showcase ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    console.error("Showcase fetch error:", err);
    res.status(500).json({ error: "Failed to fetch showcase" });
  }
});

app.post("/api/featured-showcase", requireAuth, async (req, res) => {
  const { src, title, category, description, specs } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO featured_showcase (src, title, category, description, specs) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [src, title, category, description, specs]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Showcase create error:", err);
    res.status(500).json({ error: "Failed to create showcase slide" });
  }
});

app.delete("/api/featured-showcase/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM featured_showcase WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Showcase delete error:", err);
    res.status(500).json({ error: "Failed to delete showcase slide" });
  }
});

// ========================================
// API: Photos Gallery
// ========================================
app.get("/api/photos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM photos ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    console.error("Photos fetch error:", err);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

app.post("/api/photos", requireAuth, async (req, res) => {
  const { src, title, category, event, height } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO photos (src, title, category, event, height) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [src, title, category, event, height || "h-[400px]"]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("Photo create error:", err);
    res.status(500).json({ error: "Failed to create photo" });
  }
});

app.delete("/api/photos/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM photos WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Photo delete error:", err);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

// ========================================
// API: Upload to Hostinger via FTP
// ========================================
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
        error: "FTP credentials (FTP_USER or FTP_PASSWORD) are missing.",
        details: "Please add them in your .env.local file."
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
      errorMessage = "FTP Login Failed: Please check your FTP_USER and FTP_PASSWORD.";
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

  // Test DB connection on startup
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected:", result.rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
