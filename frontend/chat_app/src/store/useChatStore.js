import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: JSON.parse(localStorage.getItem("selectedUser")) || null,
  isUsersLoading: false,
  isMessagesLoading: false,
  userActivities: {}, // Tracks { [userId]: "typing" | "recording" | "uploading" | "downloading" | "idle" }
  replyingToMessage: null,
  setReplyingToMessage: (replyingToMessage) => set({ replyingToMessage }),

  getUsers: async (search = "", sort = "recent") => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/users?search=${search}&sort=${sort}`);
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (targetId, loadMore = false) => {
    const { messages } = get();
    if (!loadMore) set({ isMessagesLoading: true });
    try {
      const beforeCursor = loadMore && messages.length > 0 ? messages[0].createdAt : "";
      const res = await axiosInstance.get(`/messages/${targetId}?before=${beforeCursor}`);
      
      if (loadMore) {
        set({ messages: [...res.data, ...messages] });
      } else {
        set({ messages: res.data });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      set((state) => ({
        messages: [...state.messages, res.data],
        users: state.users.map((u) => {
          if (u._id === selectedUser._id) {
            return {
              ...u,
              lastMessage: {
                text: res.data.text,
                image: res.data.image ? "📷 Photo" : null,
                file: res.data.file ? "📁 Document" : null,
                voice: res.data.voice ? "🎤 Voice Note" : null,
                createdAt: res.data.createdAt,
                senderId: res.data.senderId,
                isRead: false,
              },
            };
          }
          return u;
        }).sort((a, b) => {
          const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
          const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
          return dateB - dateA;
        }),
      }));
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
      return null;
    }
  },

  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text: newText });
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? res.data : m)),
      }));
      toast.success("Message edited");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? res.data : m)),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to react to message");
    }
  },

  pinMessage: async (messageId, unpin = false) => {
    try {
      await axiosInstance.post(`/messages/pin/${messageId}`, { unpin });
      toast.success(unpin ? "Message unpinned" : "Message pinned");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to pin message");
    }
  },

  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`, { data: { deleteForEveryone } });
      if (deleteForEveryone) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId ? { ...m, isDeleted: true, text: "This message was deleted.", image: null, file: null, voice: null } : m
          ),
        }));
        toast.success("Message deleted for everyone");
      } else {
        set((state) => ({
          messages: state.messages.filter((m) => m._id !== messageId),
        }));
        toast.success("Message deleted for me");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  sendActivityState: (state) => {
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = get();
    if (socket && selectedUser) {
      const isGroup = !!selectedUser.members;
      socket.emit("activityState", { targetId: selectedUser._id, state, isGroup });
    }
  },

  // Backward compatible typing status emitter
  sendTypingStatus: (isTyping) => {
    const { sendActivityState } = get();
    sendActivityState(isTyping ? "typing" : "idle");
  },

  markAsRead: async (targetId) => {
    try {
      await axiosInstance.put(`/messages/read/${targetId}`);
    } catch (error) {
      console.log("Error marking messages as read:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Join room if it is group chat
    if (selectedUser.members) {
      socket.emit("joinGroup", selectedUser._id);
    }

    socket.on("newMessage", (newMessage) => {
      const isGroup = !!selectedUser.members;
      const isTargetMatch = isGroup 
        ? newMessage.groupId === selectedUser._id 
        : newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id;

      if (isTargetMatch) {
        get().markAsRead(selectedUser._id);
        set({ messages: [...get().messages, newMessage] });
      }

      // Update sidebar metadata
      set((state) => {
        const isCurrentChat = selectedUser?._id === (newMessage.groupId || newMessage.senderId);
        return {
          users: state.users.map((u) => {
            const isMatch = u._id === (newMessage.groupId || newMessage.senderId);
            if (isMatch) {
              return {
                ...u,
                unreadCount: isCurrentChat ? 0 : (u.unreadCount || 0) + 1,
                lastMessage: {
                  text: newMessage.isDeleted ? "This message was deleted." : newMessage.text,
                  image: newMessage.image ? "📷 Photo" : null,
                  file: newMessage.file ? "📁 Document" : null,
                  voice: newMessage.voice ? "🎤 Voice Note" : null,
                  createdAt: newMessage.createdAt,
                  senderId: newMessage.senderId,
                  isRead: isCurrentChat,
                },
              };
            }
            return u;
          }).sort((a, b) => {
            const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
            const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
            return dateB - dateA;
          }),
        };
      });
    });

    socket.on("userActivityState", ({ senderId, state }) => {
      set((stateObj) => ({
        userActivities: {
          ...stateObj.userActivities,
          [senderId]: state,
        },
      }));
    });

    // Backward compatibility typing listener
    socket.on("userTyping", ({ senderId, isTyping }) => {
      set((stateObj) => ({
        userActivities: {
          ...stateObj.userActivities,
          [senderId]: isTyping ? "typing" : "idle",
        },
      }));
    });

    socket.on("messagesRead", ({ readerId }) => {
      if (selectedUser && selectedUser._id === readerId) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.receiverId === readerId ? { ...msg, isRead: true } : msg
          ),
        }));
      }
    });

    socket.on("messageUpdate", (updatedPayload) => {
      const { messageId, text, isEdited, isDeleted, reactions } = updatedPayload;
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m._id === messageId) {
            const updated = { ...m };
            if (isEdited) {
              updated.text = text;
              updated.isEdited = true;
            }
            if (isDeleted) {
              updated.isDeleted = true;
              updated.text = "This message was deleted.";
              updated.image = null;
              updated.file = null;
              updated.voice = null;
            }
            if (reactions) {
              updated.reactions = reactions;
            }
            return updated;
          }
          return m;
        }),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = get();
    if (!socket) return;

    if (selectedUser && selectedUser.members) {
      socket.emit("leaveGroup", selectedUser._id);
    }

    socket.off("newMessage");
    socket.off("userActivityState");
    socket.off("userTyping");
    socket.off("messagesRead");
    socket.off("messageUpdate");
  },

  setSelectedUser: (selectedUser) => {
    localStorage.setItem("selectedUser", JSON.stringify(selectedUser));
    set({ selectedUser, messages: [], replyingToMessage: null });
    if (selectedUser) {
      // Clear its unreadCount locally in users list
      set((state) => ({
        users: state.users.map((u) =>
          u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u
        ),
      }));
      // Resubscribe with the new selectedUser
      get().unsubscribeFromMessages();
      get().subscribeToMessages();
    }
  },
}));