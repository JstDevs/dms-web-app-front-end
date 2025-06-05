// src/hooks/useUsers.ts
import { useState, useEffect } from "react";
import axios from "@/api/axios";
import { User } from "@/types/User";

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/users");
      setUsers(data.users); // adjust if your API structure differs
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
};
