import { User } from "@/types/User";
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
  users: User[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  error: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Mock users data
const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Test",
    email: "test@sofueled.com",
    role: "Admin",
    password: "test123",
    avatar: "",
  },
  {
    id: "user-2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Manager",
    password: "password2",
    avatar: "",
  },
  {
    id: "user-3",
    name: "Robert Johnson",
    email: "robert@example.com",
    role: "Editor",
    password: "password3",
    avatar: "",
  },
  {
    id: "user-4",
    name: "Emily Wilson",
    email: "emily@example.com",
    role: "Viewer",
    password: "password4",
    avatar: "",
  },
];

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [users] = useState<User[]>(mockUsers);
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

  const login = (email: string, password: string) => {
    try {
      setError(null);

      // Find user in mock data
      const foundUser = users.find(
        (u) => u.email === email && u.password === password
      );

      if (foundUser) {
        // Generate a simple token (in a real app, this would come from your API)
        const token = btoa(`${email}:${Date.now()}`);

        // Store both token and user data
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(foundUser));

        setUser(foundUser);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${foundUser.name}!`);
        return foundUser;
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
        users,
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
