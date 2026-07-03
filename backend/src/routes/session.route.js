import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/session.controller.js";

const router = express.Router();

router.get("/", protectRoute, getActiveSessions);
router.delete("/:id", protectRoute, revokeSession);
router.delete("/", protectRoute, revokeAllSessions);

export default router;
