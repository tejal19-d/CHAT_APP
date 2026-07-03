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

      <div className="flex-1 flex items-center justify-center p-0 md:p-4 bg-base-200">
        <div className="bg-base-100 w-full max-w-6xl h-full md:h-[calc(100vh-4.5rem)] md:rounded-xl md:shadow-xl overflow-hidden">
          <div className="flex h-full w-full">
            {/* Sidebar: Full screen on mobile if no user selected; hidden on mobile if user selected */}
            <div className={`h-full ${selectedUser ? "hidden md:block" : "w-full"} md:w-80 flex-shrink-0`}>
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