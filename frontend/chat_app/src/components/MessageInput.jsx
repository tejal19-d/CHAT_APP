import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Smile, Paperclip, Mic, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", 
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", 
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", 
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", 
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", 
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", 
  "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", 
  "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", 
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", 
  "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", 
  "🤖", "🎃", "👋", "👌", "👍", "👎", "👏", "🙏", "❤️", "✨"
];

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voicePreview, setVoicePreview] = useState(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const rawFileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const { sendMessage, sendActivityState, replyingToMessage, setReplyingToMessage } = useChatStore();
  const { authUser } = useAuthStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRawFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File exceeds 10MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
      setFileMeta({
        name: file.name,
        size: file.size,
        extension: file.name.split(".").pop().toLowerCase(),
      });
    };
    reader.readAsDataURL(file);
    sendActivityState("uploading");
    setTimeout(() => sendActivityState("idle"), 1500);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoicePreview(reader.result);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      sendActivityState("recording");
    } catch (error) {
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      sendActivityState("idle");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        // Discard data
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      setRecordingDuration(0);
      setVoicePreview(null);
      sendActivityState("idle");
      toast.error("Recording discarded.");
    }
  };

  const removePreviews = () => {
    setImagePreview(null);
    setFilePreview(null);
    setFileMeta(null);
    setVoicePreview(null);
    setRecordingDuration(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (rawFileInputRef.current) rawFileInputRef.current.value = "";
  };

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Emit typing status
    sendActivityState("typing");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      sendActivityState("idle");
    }, 2000);
  };

  const handleEmojiClick = (emoji) => {
    setText((prev) => prev + emoji);
    sendActivityState("typing");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendActivityState("idle");
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview && !voicePreview) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendActivityState("idle");
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: filePreview,
        fileMeta,
        voice: voicePreview,
        voiceDuration: voicePreview ? recordingDuration : null,
        replyTo: replyingToMessage ? replyingToMessage._id : null,
      });

      setText("");
      removePreviews();
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="p-2 sm:p-4 w-full relative">
      {/* Emoji Picker Grid */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 sm:right-20 bg-base-300 border border-zinc-700 rounded-lg p-2 max-w-[280px] h-[200px] overflow-y-auto grid grid-cols-8 gap-1.5 z-50 shadow-xl">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-lg hover:scale-125 transition-transform hover:bg-base-200 rounded p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Previews wrapper */}
      <div className="flex flex-col gap-2 mb-2">
        {replyingToMessage && (
          <div className="flex items-center justify-between p-2 bg-base-300/60 border-l-4 border-primary rounded-lg text-xs w-full">
            <div className="truncate pr-4">
              <p className="font-semibold opacity-75">
                Replying to {replyingToMessage.senderId === authUser?._id ? "yourself" : "contact"}
              </p>
              <p className="truncate opacity-65">
                {replyingToMessage.text || "📷 Attachment"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToMessage(null)}
              className="p-1 hover:bg-base-200 rounded-full transition-colors text-zinc-500 hover:text-zinc-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {imagePreview && (
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-zinc-700" />
            <button onClick={removePreviews} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center" type="button">
              <X className="size-3" />
            </button>
          </div>
        )}

        {filePreview && fileMeta && (
          <div className="flex items-center gap-2 p-2 bg-base-200 border border-zinc-700 rounded-lg relative max-w-xs">
            <Paperclip className="size-6 text-primary" />
            <div className="text-xs truncate max-w-[150px]">
              <p className="font-semibold truncate">{fileMeta.name}</p>
              <p className="opacity-60 text-[10px]">{(fileMeta.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={removePreviews} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center" type="button">
              <X className="size-3" />
            </button>
          </div>
        )}

        {voicePreview && (
          <div className="flex items-center gap-2 p-2 bg-base-200 border border-zinc-700 rounded-lg relative">
            <Mic className="size-5 text-red-500 animate-pulse" />
            <span className="text-xs">Voice recording ({formatDuration(recordingDuration)})</span>
            <button onClick={removePreviews} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center" type="button">
              <X className="size-3" />
            </button>
          </div>
        )}
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 items-center bg-base-200/50 p-1.5 rounded-xl border border-base-content/10">
          
          {/* Emoji Picker Button */}
          <button
            type="button"
            className={`btn btn-ghost btn-circle btn-sm ${showEmojiPicker ? "text-primary" : "text-zinc-400"}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={18} />
          </button>

          {/* Paperclip Button for Files */}
          <button
            type="button"
            className={`btn btn-ghost btn-circle btn-sm ${filePreview ? "text-primary" : "text-zinc-400"}`}
            onClick={() => rawFileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </button>

          {/* Image Upload Button */}
          <button
            type="button"
            className={`btn btn-ghost btn-circle btn-sm ${imagePreview ? "text-primary" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={18} />
          </button>

          {/* Inputs */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            className="hidden"
            ref={rawFileInputRef}
            onChange={handleRawFileChange}
          />

          {isRecording ? (
            <div className="flex-1 flex items-center justify-between px-3 bg-red-500/10 rounded-lg h-9">
              <div className="flex items-center gap-2 text-red-500 font-semibold text-xs">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <span>Recording {formatDuration(recordingDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={cancelRecording} className="text-zinc-400 hover:text-red-500 transition-colors p-1" title="Discard">
                  <Trash2 size={16} />
                </button>
                <button type="button" onClick={stopRecording} className="btn btn-xs btn-error text-white px-2 py-0.5 rounded" title="Done">
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <input
              type="text"
              className="flex-1 bg-transparent border-0 outline-none px-2 h-9 text-sm text-base-content"
              placeholder="Type a message..."
              value={text}
              onChange={handleTextChange}
              disabled={!!voicePreview}
            />
          )}

          {/* Voice Mic Button */}
          {!isRecording && !voicePreview && (
            <button
              type="button"
              className="btn btn-ghost btn-circle btn-sm text-zinc-400 hover:text-red-500"
              onClick={startRecording}
            >
              <Mic size={18} />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !filePreview && !voicePreview}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;