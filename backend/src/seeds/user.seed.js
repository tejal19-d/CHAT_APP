import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

config();

const seedUsers = [
  {
    email: "emma.thompson@example.com",
    fullName: "Emma Thompson",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  // ... other users
];

const seedDatabase = async () => {
  try {
    await connectDB();

    const hashedUsers = await Promise.all(
      seedUsers.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return { ...user, password: hashedPassword };
      })
    );

    await User.deleteMany();
    await User.insertMany(hashedUsers);
    console.log("✅ Seeded users with hashed passwords!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
};

seedDatabase();
