import { useThemeStore } from "../store/useThemeStore";
import { Send, Trash2, Lock, Sun, Moon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  const handlePasswordUpdate = () => {
    if (!oldPassword || !newPassword) {
      return toast.error("Please fill both fields.");
    }

    // Simulated success
    toast.success("Password updated!");
    setOldPassword("");
    setNewPassword("");
  };

  const handleDeleteAccount = () => {
    const confirm = window.confirm("Are you sure you want to delete your account?");
    if (confirm) {
      // Simulated deletion
      toast.success("Account deleted!");
    }
  };

  return (
    <div className="h-full min-h-screen pt-20 px-4 max-w-2xl mx-auto space-y-10">
      {/* Light/Dark Toggle */}
      <div className="bg-base-200 p-4 rounded-xl shadow-md flex items-center justify-between">
        <h2 className="text-lg font-semibold">Theme</h2>
        <button onClick={handleThemeToggle} className="btn btn-sm btn-outline flex gap-2 items-center">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          Switch to {theme === "light" ? "Dark" : "Light"}
        </button>
      </div>

      {/* Chat Preview */}
      <div className="bg-base-200 p-4 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3">Chat Preview</h3>
        <div className="bg-base-100 rounded-lg p-4 space-y-4 border border-base-300">
          {PREVIEW_MESSAGES.map((message) => (
            <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl p-3 shadow-sm 
                ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}`}>
                <p className="text-sm">{message.content}</p>
                <p className="text-[10px] mt-1.5 text-right text-base-content/70">12:00 PM</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered w-full"
              value="This is a preview"
              readOnly
            />
            <button className="btn btn-primary">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Update Password */}
      <div className="bg-base-200 p-4 rounded-xl shadow-md space-y-2">
        <h3 className="font-semibold">Update Password</h3>
        <input
          type="password"
          placeholder="Old Password"
          className="input input-bordered w-full"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New Password"
          className="input input-bordered w-full"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={handlePasswordUpdate} className="btn btn-success mt-2 w-full">
          <Lock size={18} className="mr-2" />
          Update Password
        </button>
      </div>

      {/* Delete Account */}
      <div className="text-center">
        <button onClick={handleDeleteAccount} className="btn btn-error btn-outline">
          <Trash2 size={18} className="mr-2" />
          Delete My Account
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
