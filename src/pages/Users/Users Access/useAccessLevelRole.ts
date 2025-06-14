import { useEffect, useState } from "react";
import { getAllUserAccess } from "./userAccessService";
import toast from "react-hot-toast";
import { createListCollection } from "@chakra-ui/react";

const useAccessLevelRole = () => {
  const [accessRoles, setAccessRoles] = useState<
    { ID: number; Description: string }[]
  >([]);

  const [accessOptions, setAccessOptions] = useState<ReturnType<
    typeof createListCollection
  > | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const result = await getAllUserAccess();
        const roles = result.data.userAccess || [];

        setAccessRoles(roles);

        const AccessLevelOptions = createListCollection({
          items: roles.map((role: any) => ({
            value: role.ID.toString(),
            label: role.Description,
          })),
        });

        setAccessOptions(AccessLevelOptions);
      } catch (error) {
        toast.error("Failed to fetch access roles");
        console.error("Failed to fetch access roles", error);
      }
    };

    fetchRoles();
  }, []);

  return { accessRoles, accessOptions };
};

export default useAccessLevelRole;
