import React, { createContext, useContext, useState, ReactNode } from "react";
import { User } from "../types/User";
import toast from "react-hot-toast";

// Mock data
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
    avatar: "",
  },
  {
    id: "user-3",
    name: "Robert Johnson",
    email: "robert@example.com",
    role: "Editor",
    avatar: "",
  },
  {
    id: "user-4",
    name: "Emily Wilson",
    email: "emily@example.com",
    role: "Viewer",
    avatar: "",
  },
];

interface UserContextType {
  user: User | null;
  users: User[];
  login: (credentials: { email: string; password: string }) => User | null;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(mockUsers[0]); // Auto-login for demo

  const login = (credentials: { email: string; password: string }) => {
    const foundUser = mockUsers.find(
      (u) =>
        u.email === credentials.email && u.password === credentials.password
    );

    if (foundUser) {
      setUser(foundUser);
      return foundUser;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, users: mockUsers, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
