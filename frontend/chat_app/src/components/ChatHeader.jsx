import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-3 border-b border-base-300 bg-base-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Back Button (Always visible on mobile & desktop) */}
        <button 
          onClick={() => setSelectedUser(null)} 
          className="btn btn-ghost btn-circle btn-sm text-base-content/75 hover:bg-base-200 transition-colors flex items-center justify-center"
          title="Back to Chats"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Avatar */}
        <div className="avatar">
          <div className="size-10 rounded-full relative">
            <img 
              src={selectedUser.profilePic || "/avatar.png"} 
              alt={selectedUser.fullName} 
              className="object-cover rounded-full"
            />
          </div>
        </div>

        {/* User info */}
        <div>
          <h3 className="font-semibold text-sm">{selectedUser.fullName}</h3>
          <p className="text-xs text-base-content/60 truncate max-w-[200px] sm:max-w-md">
            {selectedUser.bio || (onlineUsers.includes(selectedUser._id) ? "Online" : "Offline")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;