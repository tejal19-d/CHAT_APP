import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "Hey there! I am using ChatApp.",
    },
    presence: {
      type: String,
      enum: ["online", "offline", "away", "busy", "invisible"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    pinnedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    archivedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    mutedChats: [
      {
        chatId: { type: mongoose.Schema.Types.ObjectId },
        muteUntil: { type: Date },
      },
    ],
    favoriteChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    unreadChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: "",
    },
    passwordResetToken: {
      type: String,
      default: "",
    },
    passwordResetExpires: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;