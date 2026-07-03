import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember,
  leaveGroup,
  promoteAdmin,
  demoteAdmin,
  transferOwnership,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);
router.post("/:id/add", protectRoute, addMembers);
router.post("/:id/remove", protectRoute, removeMember);
router.post("/:id/leave", protectRoute, leaveGroup);
router.post("/:id/promote", protectRoute, promoteAdmin);
router.post("/:id/demote", protectRoute, demoteAdmin);
router.post("/:id/transfer", protectRoute, transferOwnership);

export default router;
