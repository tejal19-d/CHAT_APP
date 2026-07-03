import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { cloudinary } from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Helper to notify other group members via Socket
const broadcastGroupUpdate = async (group, event, payload) => {
  group.members.forEach((m) => {
    const socketId = getReceiverSocketId(m.userId);
    if (socketId) {
      io.to(socketId).emit(event, payload);
    }
  });
};

// Helper to create automated system messages
const createSystemMessage = async (groupId, text) => {
  try {
    const sysMsg = new Message({
      senderId: null, // Indicates system message
      groupId,
      text,
    });
    await sysMsg.save();
    
    // Broadcast message
    const group = await Group.findById(groupId);
    if (group) {
      group.members.forEach((m) => {
        const socketId = getReceiverSocketId(m.userId);
        if (socketId) {
          io.to(socketId).emit("newMessage", sysMsg);
        }
      });
    }
  } catch (error) {
    console.error("System message failed:", error.message);
  }
};

// Create Group Chat
export const createGroup = async (req, res) => {
  try {
    const { name, description, avatar, members = [] } = req.body;
    const ownerId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    let avatarUrl = "";
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      avatarUrl = uploadResponse.secure_url;
    }

    // Format member array including owner
    const formattedMembers = [{ userId: ownerId, role: "owner" }];
    members.forEach((memberId) => {
      if (memberId !== ownerId.toString()) {
        formattedMembers.push({ userId: memberId, role: "member" });
      }
    });

    const newGroup = new Group({
      name,
      description,
      avatar: avatarUrl,
      createdBy: ownerId,
      members: formattedMembers,
    });

    await newGroup.save();

    // Broadcast group creation socket event to all members
    await broadcastGroupUpdate(newGroup, "groupCreated", newGroup);

    // Create system message
    await createSystemMessage(newGroup._id, `Group "${name}" was created by ${req.user.fullName}.`);

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error in createGroup: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all groups current user is member of
export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ "members.userId": userId }).populate("members.userId", "-password");
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update group details
export const updateGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { name, description, avatar } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Validate admin/owner permissions
    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || (me.role !== "owner" && me.role !== "admin")) {
      return res.status(403).json({ message: "Unauthorized. Admin role required." });
    }

    if (name) {
      const oldName = group.name;
      group.name = name;
      await createSystemMessage(groupId, `Group was renamed from "${oldName}" to "${name}".`);
    }
    if (description !== undefined) group.description = description;

    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      group.avatar = uploadResponse.secure_url;
      await createSystemMessage(groupId, `Group avatar was updated.`);
    }

    await group.save();
    await broadcastGroupUpdate(group, "groupUpdated", group);

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in updateGroup: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Group (Owner only)
export const deleteGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || me.role !== "owner") {
      return res.status(403).json({ message: "Unauthorized. Only the owner can delete the group." });
    }

    await broadcastGroupUpdate(group, "groupDeleted", { groupId });
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGroup: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add Members to Group
export const addMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userIds } = req.body; // Array of userIds to add
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Validate admin/owner permissions
    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || (me.role !== "owner" && me.role !== "admin")) {
      return res.status(403).json({ message: "Unauthorized. Admin role required." });
    }

    const addedNames = [];
    for (const userId of userIds) {
      const alreadyMember = group.members.some((m) => m.userId.toString() === userId.toString());
      if (!alreadyMember) {
        group.members.push({ userId, role: "member" });
        const user = await User.findById(userId);
        if (user) addedNames.push(user.fullName);
      }
    }

    await group.save();
    await broadcastGroupUpdate(group, "groupUpdated", group);

    if (addedNames.length > 0) {
      await createSystemMessage(groupId, `${addedNames.join(", ")} joined the group.`);
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in addMembers: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove Member from Group
export const removeMember = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userIdToRemove } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Validate admin/owner permissions
    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || (me.role !== "owner" && me.role !== "admin")) {
      return res.status(403).json({ message: "Unauthorized. Admin role required." });
    }

    const targetUser = group.members.find((m) => m.userId.toString() === userIdToRemove.toString());
    if (!targetUser) return res.status(404).json({ message: "Target user is not a member of this group" });

    // Prevent removing owner or admins by simple admins
    if (targetUser.role === "owner") {
      return res.status(403).json({ message: "Cannot remove the group owner" });
    }
    if (targetUser.role === "admin" && me.role === "admin") {
      return res.status(403).json({ message: "Group admins cannot remove other admins" });
    }

    const removedUserInfo = await User.findById(userIdToRemove);
    const removedName = removedUserInfo ? removedUserInfo.fullName : "User";

    // Notify the removed member before modifying members array
    const removedMemberSocketId = getReceiverSocketId(userIdToRemove);
    if (removedMemberSocketId) {
      io.to(removedMemberSocketId).emit("groupRemoved", { groupId });
    }

    group.members = group.members.filter((m) => m.userId.toString() !== userIdToRemove.toString());
    await group.save();
    await broadcastGroupUpdate(group, "groupUpdated", group);

    await createSystemMessage(groupId, `${removedName} was removed from the group.`);

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in removeMember: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Leave Group
export const leaveGroup = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me) return res.status(400).json({ message: "You are not a member of this group" });

    // If owner is leaving, they must transfer ownership first
    if (me.role === "owner" && group.members.length > 1) {
      return res.status(400).json({ message: "You must transfer ownership before leaving the group." });
    }

    group.members = group.members.filter((m) => m.userId.toString() !== myId.toString());
    await group.save();

    await broadcastGroupUpdate(group, "groupUpdated", group);
    await createSystemMessage(groupId, `${req.user.fullName} left the group.`);

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Error in leaveGroup: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Promote Member to Admin
export const promoteAdmin = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || me.role !== "owner") {
      return res.status(403).json({ message: "Unauthorized. Owner permission required." });
    }

    const member = group.members.find((m) => m.userId.toString() === userId.toString());
    if (!member) return res.status(404).json({ message: "User is not a member of this group" });

    member.role = "admin";
    await group.save();

    const user = await User.findById(userId);
    const memberName = user ? user.fullName : "User";

    await broadcastGroupUpdate(group, "groupUpdated", group);
    await createSystemMessage(groupId, `${memberName} was promoted to Admin.`);

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in promoteAdmin: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Demote Admin to Member
export const demoteAdmin = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || me.role !== "owner") {
      return res.status(403).json({ message: "Unauthorized. Owner permission required." });
    }

    const member = group.members.find((m) => m.userId.toString() === userId.toString());
    if (!member) return res.status(404).json({ message: "User is not a member of this group" });

    member.role = "member";
    await group.save();

    const user = await User.findById(userId);
    const memberName = user ? user.fullName : "User";

    await broadcastGroupUpdate(group, "groupUpdated", group);
    await createSystemMessage(groupId, `${memberName} was demoted to Member.`);

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in demoteAdmin: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Transfer Ownership
export const transferOwnership = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { newOwnerId } = req.body;
    const myId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const me = group.members.find((m) => m.userId.toString() === myId.toString());
    if (!me || me.role !== "owner") {
      return res.status(403).json({ message: "Unauthorized. Only the owner can transfer ownership." });
    }

    const newOwner = group.members.find((m) => m.userId.toString() === newOwnerId.toString());
    if (!newOwner) return res.status(404).json({ message: "Target user is not a member of this group" });

    me.role = "admin";
    newOwner.role = "owner";
    group.createdBy = newOwnerId;
    await group.save();

    const user = await User.findById(newOwnerId);
    const ownerName = user ? user.fullName : "User";

    await broadcastGroupUpdate(group, "groupUpdated", group);
    await createSystemMessage(groupId, `${ownerName} is now the owner of this group.`);

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in transferOwnership: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
