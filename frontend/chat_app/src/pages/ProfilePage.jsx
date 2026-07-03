import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [bioText, setBioText] = useState(authUser?.bio || "");
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);

  const handleBioSave = async () => {
    setIsUpdatingBio(true);
    try {
      await updateProfile({ bio: bioText });
    } catch (err) {
      toast.error("Failed to update bio");
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large. Max 10MB allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const res = await axiosInstance.post("/auth/upload-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newProfilePic = res.data.url;
      setSelectedImg(newProfilePic);
      await updateProfile({ profilePic: newProfilePic });
      toast.success("Profile picture updated!");
    } catch (err) {
      toast.error("Upload failed. Try again.");
      console.error(err);
    }
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full cursor-pointer transition-all duration-200 ${
                  isUpdatingProfile ? "animate-pulse pointer-events-none" : ""
                }`}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.fullName}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.email}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <span>About / Status</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered w-full rounded-lg bg-base-200"
                  placeholder="Set your status/bio..."
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                />
                <button
                  onClick={handleBioSave}
                  disabled={isUpdatingBio || bioText === authUser?.bio}
                  className="btn btn-primary"
                >
                  {isUpdatingBio ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
