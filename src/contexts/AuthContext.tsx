import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, LoginRequest } from "@/types";
import { api, type ApiError } from "@/lib/api/client";

function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" && err !== null &&
    "status" in err && "message" in err
  );
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem("token");
    const apikey = localStorage.getItem("apikey");
    const username = localStorage.getItem("username") || "User";

    // Only proceed if we have token and apikey (username has default)
    if (token && apikey) {
      setUser({
        id: 0,
        username,
        role: "User",
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const data = await api.login(credentials);
      localStorage.setItem("token", data.token);
      setUser({
        id: 0,
        username: data.username,
        role: data.role,
      });
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw new Error("Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "Admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
