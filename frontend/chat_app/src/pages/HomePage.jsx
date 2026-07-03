import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen bg-base-200 overflow-hidden flex flex-col">
      {/* Spacer for the fixed Navbar */}
      <div className="h-14"></div>

      <div className="flex-1 bg-base-200 overflow-hidden">
        {/* On mobile: takes full width and height, aligned to the top. On desktop: centered card styling. */}
        <div className="w-full h-full md:p-4 md:flex md:items-center md:justify-center">
          <div className="bg-base-100 w-full max-w-6xl h-full md:h-[calc(100vh-5rem)] md:rounded-xl md:shadow-xl overflow-hidden flex">
            {/* Sidebar: Full screen on mobile if no user selected; hidden on mobile if user selected */}
            <div className={`h-full ${selectedUser ? "hidden md:block" : "w-full"} md:w-80 flex-shrink-0 border-r border-base-300`}>
              <Sidebar />
            </div>

            {/* Chat Area: Hidden on mobile if no user selected; Full screen on mobile if user selected */}
            <div className={`h-full flex-1 ${!selectedUser ? "hidden md:flex" : "flex flex-col"} min-w-0`}>
              {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;