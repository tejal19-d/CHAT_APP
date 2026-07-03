import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import morgan from "morgan";
import mongoose from "mongoose";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import sessionRoutes from "./routes/session.route.js";
import groupRoutes from "./routes/group.route.js";
import { app, server } from "./lib/socket.js";
import logger from "./lib/logger.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// ✅ Helmet Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ✅ Morgan Request Logging
app.use(
  morgan("short", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// ✅ API Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again after 15 minutes." },
});
app.use("/api", limiter);

// ✅ Fix: Increase payload size for large image uploads (5MB)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ✅ Custom NoSQL Injection Protection Middleware
const sanitizeInput = (obj) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else {
        sanitizeInput(obj[key]);
      }
    }
  }
};
app.use((req, res, next) => {
  sanitizeInput(req.body);
  sanitizeInput(req.query);
  sanitizeInput(req.params);
  next();
});

app.use(cookieParser());

// ✅ Dynamic CORS setup
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// ✅ Health Check Endpoint
app.get("/api/health", (req, res) => {
  const status = mongoose.connection.readyState === 1 ? "healthy" : "unhealthy";
  res.status(status === "healthy" ? 200 : 503).json({
    status,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date(),
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/groups", groupRoutes);

// ✅ Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/chat_app/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "chat_app", "dist", "index.html"));
  });
}

// ✅ Global Error Handler Middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}\nStack: ${err.stack}`);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

server.listen(PORT, () => {
  logger.info("✅ Server is running on PORT: " + PORT);
  connectDB();
});
