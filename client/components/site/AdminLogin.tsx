/**
 * Admin Login Component
 * Temporary login UI for development and testing
 * Allows switching between test user roles
 */

import React, { useState, useEffect } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mockLogin,
  mockLogout,
  getAuthUser,
  getTestUsers,
} from "@/lib/auth-mock";

export function AdminLogin() {
  const [currentUser, setCurrentUser] = useState(getAuthUser());
  const [testUsers] = useState(getTestUsers());

  // Update current user when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentUser(getAuthUser());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogin = async (userId: string) => {
    try {
      const success = await mockLogin(userId);
      if (success) {
        setCurrentUser(getAuthUser());
        // Reload page to apply new auth context
        window.location.reload();
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => {
    mockLogout();
    setCurrentUser(null);
    window.location.reload();
  };

  if (currentUser) {
    // Show logged-in user dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors text-sm font-medium border border-emerald-500/50"
            title={`Logged in as ${currentUser.name}`}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{currentUser.name}</span>
            <span className="text-xs bg-emerald-600 px-2 py-1 rounded">
              {currentUser.role}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>{currentUser.name}</span>
            <span className="text-xs text-muted-foreground">
              {currentUser.email}
            </span>
            <span className="text-xs text-emerald-400 font-semibold mt-1">
              {currentUser.role.toUpperCase()}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch User
          </DropdownMenuLabel>
          {testUsers.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => handleLogin(user.id)}
              className={currentUser.id === user.id ? "bg-accent" : ""}
            >
              <User className="w-3 h-3 mr-2" />
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user.role}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-400">
            <LogOut className="w-3 h-3 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Show login button
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors text-sm font-medium border border-blue-500/50"
          title="Login as Admin"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Login</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Login as Test User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {testUsers.map((user) => (
          <DropdownMenuItem key={user.id} onClick={() => handleLogin(user.id)}>
            <User className="w-3 h-3 mr-2" />
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AdminLogin;
