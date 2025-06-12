// hooks/usePermissions.ts
import axios from "@/api/axios";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
// import { getAllUserAccess } from "./userAccessService";

type ApiPermission = {
  ID: number;
  Description: string;
};

export type Permission = {
  id: number;
  name: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
};

const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axios("/useraccess/modules");
        const data: ApiPermission[] = response.data;
        console.log(data);
        // Check if data is empty or not an array
        if (!Array.isArray(data) || data.length === 0) {
          console.warn("No permissions data received from API");
          setPermissions([]); // Set empty array as fallback
          return;
        }

        const transformed = data.map((item) => ({
          id: item.ID,
          name: item.Description,
          view: false,
          add: false,
          edit: false,
          delete: false,
          print: false,
        }));

        setPermissions(transformed);
      } catch (err) {
        setError("Failed to load permissions");
        toast.error("Failed to load permissions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, isLoading, error };
};

export default usePermissions;
