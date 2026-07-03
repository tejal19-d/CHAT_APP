import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="bg-base-100/75 backdrop-blur-md border-b border-base-content/5 fixed w-full top-0 z-40 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-6 h-14">
        <div className="flex items-center justify-between h-full">
          {/* Brand/Logo */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group hover:opacity-95 transition-opacity">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-200">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-md font-bold tracking-tight text-base-content">Chatty</h1>
            </Link>
            {!isOnline && (
              <span className="badge badge-error gap-1 text-[9px] uppercase font-extrabold px-2 py-0.5">
                <span className="size-1 bg-white rounded-full animate-ping" />
                Offline
              </span>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <div className="tooltip tooltip-bottom" data-tip="Switch Theme">
              <ThemeToggle />
            </div>

            {authUser && (
              <>
                {/* Profile Link */}
                <div className="tooltip tooltip-bottom" data-tip="My Profile">
                  <Link to="/profile" className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-primary transition-colors">
                    <User size={18} />
                  </Link>
                </div>

                {/* Settings Link */}
                <div className="tooltip tooltip-bottom" data-tip="Settings">
                  <Link to="/settings" className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-primary transition-colors">
                    <Settings size={18} />
                  </Link>
                </div>

                {/* Separator */}
                <span className="h-4 w-px bg-base-content/10 mx-1"></span>

                {/* Logout Button */}
                <div className="tooltip tooltip-bottom" data-tip="Logout">
                  <button 
                    onClick={logout} 
                    className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;