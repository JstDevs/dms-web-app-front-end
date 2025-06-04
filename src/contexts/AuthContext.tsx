import { fetchLogin } from "@/api/auth";
import { User } from "@/types/User";
import { setToken, setUserInStorage } from "@/utils/token";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  error: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          // If there's an error parsing the stored user data, clear the storage
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
        }
      }

      setLoading(false);
    };

    checkAuth();
    // Add event listener for storage changes
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const login = async (userName: string, password: string) => {
    try {
      setError(null);

      const { token, user } = await fetchLogin(userName, password);
      if (user) {
        // Store both token and user data in localStorage
        setToken(token);
        setUserInStorage(user);
        // Update state variables
        setUser(user);
        setIsAuthenticated(true);
        // Show success toast
        toast.success(`Welcome back, ${user.UserName}!`);
        // Return the user
        return user;
      } else {
        return null;
        // throw new Error("Invalid email or password");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        // users,
        isAuthenticated,
        login,
        logout,
        error,
        isLoading: loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
