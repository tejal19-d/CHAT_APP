import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Trash2, Pencil, Smile, FileText, Download, Reply, Pin } from "lucide-react";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏"];

// Custom audio note player component with playback speed options
const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [speed, setSpeed] = useState(1);

  const toggleSpeed = () => {
    const newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-base-300/40 rounded-lg max-w-[240px] border border-base-content/10 mt-1">
      <audio ref={audioRef} src={src} controls className="h-7 w-40" />
      <button
        type="button"
        onClick={toggleSpeed}
        className="badge badge-primary text-[10px] font-bold py-1 select-none cursor-pointer"
      >
        {speed}x
      </button>
    </div>
  );
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    reactToMessage,
    editMessage,
    pinMessage,
    deleteMessage,
    markAsRead,
    setReplyingToMessage,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState(null); // Tracks msgId with active picker

  useEffect(() => {
    getMessages(selectedUser._id);
    markAsRead(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, markAsRead, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEditMsg = (msg) => {
    const newText = window.prompt("Edit your message:", msg.text);
    if (newText && newText.trim() && newText.trim() !== msg.text) {
      editMessage(msg._id, newText.trim());
    }
  };

  const handleDeleteMsg = (msg) => {
    const everyone = window.confirm("Delete for Everyone? (Cancel = Delete for Me)");
    deleteMessage(msg._id, everyone);
  };

  const handlePinMsg = (msg) => {
    pinMessage(msg._id, false);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2] dark:bg-[#0b141a]">
        {messages.map((message) => {
          // If it is a system message (senderId is null)
          if (!message.senderId) {
            return (
              <div key={message._id} className="flex justify-center my-2">
                <span className="bg-base-300 text-[11px] font-semibold opacity-75 px-3 py-1 rounded-full text-zinc-600 dark:text-zinc-300 shadow-sm border border-base-content/5">
                  {message.text}
                </span>
              </div>
            );
          }

          const isMe = message.senderId === authUser._id;

          return (
            <div
              key={message._id}
              className={`chat ${isMe ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-8 rounded-full border">
                  <img
                    src={
                      isMe
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              
              <div className="chat-header mb-0.5 flex items-center opacity-75">
                <time className="text-[10px] ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                {isMe && (
                  <span className={`ml-1 text-[9px] font-bold ${message.isRead ? "text-blue-500" : "text-zinc-400"}`}>
                    ✓✓
                  </span>
                )}
                {message.isEdited && (
                  <span className="text-[9px] italic opacity-60 ml-1.5">(edited)</span>
                )}
              </div>

              <div 
                className={`chat-bubble shadow-sm max-w-[85%] sm:max-w-[70%] relative group ${
                  isMe
                    ? "!bg-[#d9fdd3] dark:!bg-[#005c4b] !text-zinc-800 dark:!text-zinc-100 rounded-2xl rounded-tr-none"
                    : "!bg-white dark:!bg-[#202c33] !text-zinc-800 dark:!text-zinc-100 rounded-2xl rounded-tl-none"
                }`}
              >
                
                {/* Floating Emoji Picker Popover */}
                {activeReactionPicker === message._id && (
                  <div className="absolute -top-10 left-0 bg-base-300 border border-zinc-700 rounded-full py-1 px-2 flex gap-1 z-30 shadow-lg">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          reactToMessage(message._id, emoji);
                          setActiveReactionPicker(null);
                        }}
                        className="hover:scale-125 transition-transform px-1 text-xs"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Inline Quote Reply Header */}
                {message.replyTo && (
                  <div className="p-2 mb-2 text-[11px] border-l-4 border-primary bg-black/10 rounded-md">
                    <p className="font-semibold opacity-75">
                      {message.replyTo.senderId === authUser._id ? "You" : selectedUser.fullName}
                    </p>
                    <p className="truncate opacity-65">
                      {message.replyTo.text || "📷 Attachment"}
                    </p>
                  </div>
                )}

                {/* Message Hover Actions Toolbar */}
                <div className={`absolute -top-3 ${isMe ? "right-2" : "left-2"} opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-150 flex items-center gap-1.5 bg-base-200/95 py-0.5 px-2.5 rounded-full border border-base-content/10 shadow-md z-10`}>
                  <button
                    onClick={() => setActiveReactionPicker(activeReactionPicker === message._id ? null : message._id)}
                    className="text-zinc-500 hover:text-primary transition-colors"
                    title="React"
                  >
                    <Smile size={13} />
                  </button>
                  {isMe && !message.isDeleted && (
                    <>
                      <button
                        onClick={() => handleEditMsg(message)}
                        className="text-zinc-500 hover:text-blue-500 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMsg(message)}
                        className="text-zinc-500 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handlePinMsg(message)}
                    className="text-zinc-500 hover:text-primary transition-colors"
                    title="Pin"
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    onClick={() => setReplyingToMessage(message)}
                    className="text-zinc-500 hover:text-primary transition-colors"
                    title="Reply"
                  >
                    <Reply size={13} />
                  </button>
                </div>

                {/* Attachment Renderers */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-1.5"
                  />
                )}

                {message.file && message.fileMeta && (
                  <div className="flex items-center gap-2 p-2 bg-base-200/50 rounded-lg max-w-xs border border-base-content/10 mb-1.5">
                    <FileText className="size-6 text-primary" />
                    <div className="text-xs truncate max-w-[150px]">
                      <p className="font-semibold truncate">{message.fileMeta.name}</p>
                      <p className="opacity-60 text-[10px]">
                        {(message.fileMeta.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <a
                      href={message.file}
                      download={message.fileMeta.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto p-1 text-zinc-500 hover:text-primary transition-colors"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                )}

                {message.voice && <AudioPlayer src={message.voice} />}

                {/* Text Content */}
                {message.text && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                )}

                {/* Message Reactions Row */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {message.reactions.map((r, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-base-200/90 py-0.5 px-1.5 rounded-full select-none cursor-pointer shadow-sm border border-base-content/5"
                        onClick={() => reactToMessage(message._id, r.emoji)}
                        title="Click to remove reaction"
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;