import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { cloudinary } from "../lib/cloudinary.js";

// ✅ Signup
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log("❌ Signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("❌ Login error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Logout
export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("❌ Logout error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update Profile (fullName, password, profilePic)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, password, profilePic } = req.body;

    const updateData = {};

    if (fullName) updateData.fullName = fullName;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.log("❌ Profile update error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Check Auth
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("❌ Auth check error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
