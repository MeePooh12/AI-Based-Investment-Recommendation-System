import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import axios from "axios";
import Joi from "joi";
import sendVerificationEmail from "./utils/sendVerificationEmail.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

/* ---------- CORS ---------- */
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

/* ---------- Rate limiting ---------- */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // per IP
  message: { error: "Too many signup attempts, please try later." },
});

/* ---------- Postgres pool ---------- */
const { Pool } = pg;
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "mywebsitedb",
});

/* quick DB check on start */
db.query("SELECT 1")
  .then(() => console.log("✔ DB connected"))
  .catch((err) => console.error("❌ DB connection error:", err.message));

/* ---------- Nodemailer ---------- */
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT || 465),
  secure: process.env.MAIL_SECURE === "true" || process.env.MAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ---------- Helpers & Schemas ---------- */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  dob: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD ← แก้แล้ว
  recaptcha: Joi.string().allow("", null),
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/* ---------- Utility: verify reCAPTCHA v3 ---------- */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET not set — bypass verify (dev).");
    return { success: true, score: 1 };
  }
  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token || "");
    const resp = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 }
    );
    return resp.data; // { success, score, ... }
  } catch (err) {
    console.error("recaptcha verify error:", err.message || err);
    throw new Error("reCAPTCHA verify failed");
  }
}

/* ---------- Routes ---------- */

// Ping
app.get("/ping", (req, res) => res.json({ message: "pong" }));

// Register
app.post("/api/register", signupLimiter, async (req, res) => {
  try {
    const { email, password, dob, recaptcha } = req.body;

    // verify recaptcha
    const rc = await verifyRecaptcha(recaptcha);
    if (!rc.success || rc.score < 0.5) {
      return res.status(400).json({ error: "reCAPTCHA failed" });
    }

    // check duplicate
    const exists = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    if (exists.rows.length > 0) {
      return res.status(200).json({ message: "A verification email will be sent if this is a new account." });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    // insert new unverified user
    await db.query(
      "INSERT INTO users (email, password, dob, is_verified) VALUES ($1,$2,$3,$4)",
      [email, hashed, dob, false]
    );

    // create verification token
    const token = jwt.sign(
      { email },
      process.env.MAIL_VERIFY_SECRET,
      { expiresIn: "15m" }
    );

    // send email
    const verifyURL = `http://localhost:5000/api/verify/${token}`;
    await sendVerificationEmail(email, verifyURL);

    return res.status(200).json({
      message: "Registration successful! Please check your email to verify your account."
    });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Invalid input" });

    const { email, password } = value;
    const userRes = await db.query("SELECT id, email, password FROM users WHERE email=$1 LIMIT 1", [email]);
    if (userRes.rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "dev_jwt_secret", {
      expiresIn: process.env.JWT_EXPIRE || "1d",
    });

    res.json({ message: "Login success", token });
  } catch (err) {
    console.error("Login Error:", err?.message || err);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify Email
app.get("/api/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const payload = jwt.verify(token, process.env.MAIL_VERIFY_SECRET);

    await db.query(
      "UPDATE users SET is_verified=true WHERE email=$1",
      [payload.email]
    );

    return res.send("Email verified successfully! You can now log in.");
  } catch (err) {
    return res.status(400).send("Invalid or expired verification link.");
  }
});


// Forgot password (send reset token)
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const userRes = await db.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [email]);
    if (userRes.rows.length === 0) {
      // respond generically
      return res.status(200).json({ message: "If this email exists, a reset link will be sent." });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET || "dev_jwt_secret", { expiresIn: "15m" });
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query("UPDATE users SET reset_token=$1, reset_expires=$2 WHERE email=$3", [token, expireAt, email]);

    const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

    const websiteName = process.env.WEBSITE_NAME || "AI Investment";

    const mailHtml = `
      <div style="font-family:Arial,sans-serif;color:#111">
        <h3>${websiteName} - Password Reset</h3>
        <p>คลิกปุ่มด้านล่างเพื่อรีเซ็ตรหัสผ่าน (ลิงก์หมดอายุ 15 นาที)</p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a>
        <p>หากไม่ใช่คุณ ให้เพิกเฉยอีเมลนี้</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: email,
      subject: `${websiteName} - Password Reset`,
      html: mailHtml,
    });

    return res.json({ message: "If this email exists, a reset link will be sent." });
  } catch (err) {
    console.error("Forgot Password Error:", err?.message || err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Reset password
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ error: "Token and new password required" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_jwt_secret");
    } catch {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const userRes = await db.query("SELECT email, reset_expires, reset_token FROM users WHERE email=$1 LIMIT 1", [decoded.email]);
    if (userRes.rows.length === 0) return res.status(400).json({ error: "Invalid token" });

    const user = userRes.rows[0];
    if (!user.reset_token || user.reset_token !== token) return res.status(400).json({ error: "Invalid token" });
    if (new Date() > new Date(user.reset_expires)) return res.status(400).json({ error: "Token expired" });

    const hashed = await bcrypt.hash(new_password, Number(process.env.BCRYPT_ROUNDS || 10));
    await db.query("UPDATE users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE email=$2", [hashed, decoded.email]);

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err?.message || err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Start server ---------- */
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
