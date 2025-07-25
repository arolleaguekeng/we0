import React, { useState, useRef, useEffect } from "react";
import { Sidebar } from "../Sidebar";
import { db } from "../../utils/indexDB";
import { getCurrentUser } from "../../api/persistence/db";
import type { UserModel } from "../../api/persistence/userModel";
import { useTranslation } from "react-i18next";

export function ProjectTitle() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [user, setUser] = useState<UserModel | null>(null);
  const { t } = useTranslation();
  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"
    );
  };

  // Get chat count
  const loadChatCount = async () => {
    const uuids = await db.getAllUuids();
    setChatCount(uuids.length);
  };

  useEffect(() => {
    loadChatCount();
    // Subscribe to database updates
    const unsubscribe = db.subscribe(loadChatCount);
    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsSidebarOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 300);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`
          w-6 h-6 rounded-full
          flex items-center justify-center
          text-white text-xs font-medium
          ${user?.photoURL ? "" : "bg-purple-500 dark:bg-purple-600"}
        `}
          style={
            user?.photoURL
              ? {
                  backgroundImage: `url(${user.photoURL})`,
                  backgroundSize: "cover",
                }
              : undefined
          }
        >
          {!user?.photoURL &&
            getInitials(user?.displayName || user?.email || "?")}
        </div>
        <span className="text-gray-900 dark:text-white text-[14px] font-normal">
          {user ? user.displayName || user.email : "Guest"}
        </span>

        <svg
          className="w-3.5 h-3.5 text-gray-400 transition-transform group-hover:text-gray-600 dark:group-hover:text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>

        <div className="flex items-center gap-1 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span className="text-xs">{chatCount}</span>
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        username={user?.displayName || user?.email || t("login.guest")}
      />
    </div>
  );
}
