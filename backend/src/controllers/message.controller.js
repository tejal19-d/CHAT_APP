import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { cloudinary } from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Helper to broadcast events to all active members of a group
const broadcastToGroup = async (groupId, event, data, excludeUserId = null) => {
  try {
    const group = await Group.findById(groupId);
    if (!group) return;

    group.members.forEach((member) => {
      if (excludeUserId && member.userId.toString() === excludeUserId.toString()) return;
      const socketId = getReceiverSocketId(member.userId);
      if (socketId) {
        io.to(socketId).emit(event, data);
      }
    });
  } catch (error) {
    console.error("Error in broadcastToGroup:", error.message);
  }
};

// Fetch users list with last messages, unread badge indicators, sorting, and search query parameters
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { search = "", sort = "recent" } = req.query;

    let query = { _id: { $ne: loggedInUserId } };
    if (search) {
      query.fullName = { $regex: search, $options: "i" };
    }

    const filteredUsers = await User.find(query).select("-password");

    const usersWithMetadata = await Promise.all(
      filteredUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
          deletedFor: { $ne: loggedInUserId },
        })
          .sort({ createdAt: -1 })
          .limit(1);

        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          isRead: false,
        });

        const isPinned = req.user.pinnedChats?.includes(user._id);
        const isArchived = req.user.archivedChats?.includes(user._id);
        const isFavorite = req.user.favoriteChats?.includes(user._id);
        const isMuted = req.user.mutedChats?.some(
          (c) => c.chatId.toString() === user._id.toString() && c.muteUntil > Date.now()
        );

        return {
          ...user.toObject(),
          unreadCount,
          isPinned,
          isArchived,
          isFavorite,
          isMuted,
          lastMessage: lastMessage ? {
            text: lastMessage.isDeleted ? "This message was deleted." : lastMessage.text,
            image: lastMessage.image ? "📷 Photo" : null,
            file: lastMessage.file ? "📁 Document" : null,
            voice: lastMessage.voice ? "🎤 Voice Note" : null,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            isRead: lastMessage.isRead,
          } : null,
        };
      })
    );

    // Apply sorting
    usersWithMetadata.sort((a, b) => {
      if (sort === "pinned") {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json(usersWithMetadata);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Retrieve messages with cursor-based pagination
export const getMessages = async (req, res) => {
  try {
    const { id: targetId } = req.params; // Can be userToChatId or groupId
    const myId = req.user._id;
    const { before, limit = 30 } = req.query;

    let query = { deletedFor: { $ne: myId } };

    // Detect if target is group or user
    const isGroup = await Group.exists({ _id: targetId });
    if (isGroup) {
      query.groupId = targetId;
    } else {
      query.$or = [
        { senderId: myId, receiverId: targetId },
        { senderId: targetId, receiverId: myId },
      ];
      query.groupId = { $exists: false };
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Reverse to return chronological order
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message supporting image, voice recording, documents, replies, and forwards
export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, fileMeta, voice, voiceDuration, replyTo, isForwarded, originalSenderId } = req.body;
    const { id: targetId } = req.params; // receiverId or groupId
    const senderId = req.user._id;

    let imageUrl, fileUrl, voiceUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    if (file) {
      // Base64 document uploads (PDF, Text, ZIP, etc.)
      const uploadResponse = await cloudinary.uploader.upload(file, { resource_type: "raw" });
      fileUrl = uploadResponse.secure_url;
    }

    if (voice) {
      // Base64 voice note uploads (MP3, WAV, etc.)
      const uploadResponse = await cloudinary.uploader.upload(voice, { resource_type: "video" });
      voiceUrl = uploadResponse.secure_url;
    }

    // Check target type
    const isGroup = await Group.exists({ _id: targetId });

    const newMessage = new Message({
      senderId,
      text,
      image: imageUrl,
      file: fileUrl,
      fileMeta,
      voice: voiceUrl,
      voiceDuration,
      replyTo,
      isForwarded,
      originalSenderId,
    });

    if (isGroup) {
      newMessage.groupId = targetId;
    } else {
      newMessage.receiverId = targetId;
    }

    await newMessage.save();

    // Populate reply references for the socket emission payload
    if (replyTo) {
      await newMessage.populate("replyTo");
    }

    // Sync via socket
    if (isGroup) {
      await broadcastToGroup(targetId, "newMessage", newMessage);
    } else {
      const receiverSocketId = getReceiverSocketId(targetId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Read Receipts
export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const myId = req.user._id;

    const isGroup = await Group.exists({ _id: targetId });

    if (isGroup) {
      // Add user to readBy array if not already present
      await Message.updateMany(
        { groupId: targetId, "readBy.userId": { $ne: myId } },
        { $push: { readBy: { userId: myId, readAt: new Date() } } }
      );
      
      await broadcastToGroup(targetId, "messagesRead", { readerId: myId });
    } else {
      await Message.updateMany(
        { senderId: targetId, receiverId: myId, isRead: false },
        { $set: { isRead: true } }
      );

      const senderSocketId = getReceiverSocketId(targetId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", { readerId: myId });
      }
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Soft Delete (Delete for everyone / Delete for me)
export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (deleteForEveryone) {
      // Allow only the sender of the message to delete for everyone
      if (message.senderId.toString() !== myId.toString()) {
        return res.status(403).json({ error: "Unauthorized to delete for everyone" });
      }

      message.isDeleted = true;
      message.text = "This message was deleted.";
      message.image = undefined;
      message.file = undefined;
      message.fileMeta = undefined;
      message.voice = undefined;
      await message.save();

      const eventPayload = { messageId, isDeleted: true };
      if (message.groupId) {
        await broadcastToGroup(message.groupId, "messageUpdate", eventPayload);
      } else {
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageUpdate", eventPayload);
        }
      }
    } else {
      // Delete for Me
      if (!message.deletedFor.includes(myId)) {
        message.deletedFor.push(myId);
        await message.save();
      }
    }

    res.status(200).json({ message: "Message processed successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Edit message text
export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.senderId.toString() !== myId.toString()) {
      return res.status(403).json({ error: "Unauthorized to edit this message" });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const eventPayload = { messageId, text, isEdited: true };
    if (message.groupId) {
      await broadcastToGroup(message.groupId, "messageUpdate", eventPayload);
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageUpdate", eventPayload);
      }
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add, replace, or remove emoji reactions
export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body; // Set empty to delete reaction
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Filter existing user reactions
    message.reactions = message.reactions.filter((r) => r.userId.toString() !== myId.toString());

    if (emoji) {
      message.reactions.push({ userId: myId, emoji });
    }

    await message.save();

    const eventPayload = { messageId, reactions: message.reactions };
    if (message.groupId) {
      await broadcastToGroup(message.groupId, "messageUpdate", eventPayload);
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageUpdate", eventPayload);
      }
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in reactToMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Pin or Unpin Message
export const pinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { unpin = false } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });

      if (unpin) {
        group.pinnedMessages = group.pinnedMessages.filter((id) => id.toString() !== messageId);
      } else {
        if (group.pinnedMessages.length >= 5) {
          return res.status(400).json({ error: "Max pinned messages (5) reached" });
        }
        if (!group.pinnedMessages.includes(messageId)) {
          group.pinnedMessages.push(messageId);
        }
      }
      await group.save();
      await broadcastToGroup(message.groupId, "groupUpdate", { groupId: message.groupId, pinnedMessages: group.pinnedMessages });
    } else {
      // Direct Message Pinning logic can be bound to the users model or message state flags
      message.isPinned = !unpin;
      await message.save();
    }

    res.status(200).json({ message: unpin ? "Message unpinned" : "Message pinned" });
  } catch (error) {
    console.log("Error in pinMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};