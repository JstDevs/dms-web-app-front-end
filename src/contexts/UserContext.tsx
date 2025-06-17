import React, { createContext, useContext, useState, ReactNode } from "react";
import { User } from "../types/User";

// Mock data
const mockUsers: User[] = [];

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
    // const foundUser = mockUsers.find(
    //   (u) =>
    //     u.email === credentials.email && u.password === credentials.password
    // );

    // if (foundUser) {
    //   setUser(foundUser);
    //   return foundUser;
    // }
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
