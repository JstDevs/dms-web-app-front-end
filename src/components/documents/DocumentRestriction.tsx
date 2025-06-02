import React, { useState } from "react";

interface Props {
  restrictedFields: Record<string, string[]>; // userId => restricted field names
  document: any;
  users: { id: string; name: string }[];
  onRestrictField: (fieldName: string, userId: string) => void;
  onRemoveRestriction: (fieldName: string, userId: string) => void;
}

const FieldRestrictions: React.FC<Props> = ({
  restrictedFields,
  document,
  users,
  onRestrictField,
  onRemoveRestriction,
}) => {
  const [selectedField, setSelectedField] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const handleRestrict = () => {
    if (selectedField && selectedUser) {
      onRestrictField(selectedField, selectedUser);
      setSelectedField("");
    }
  };

  const fields = Object.keys(document.fields ?? {});

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden p-4">
      <h2 className="text-lg font-bold">Field Restrictions</h2>

      <div className="flex flex-col md:flex-row gap-4 my-4">
        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Field</option>
          {fields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>

        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select User</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleRestrict}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Restrict
        </button>
      </div>

      {selectedUser && (
        <div>
          <h3 className="text-md font-semibold mt-4">
            Restricted Fields for{" "}
            {users.find((u) => u.id === selectedUser)?.name}
          </h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            {(restrictedFields[selectedUser] || []).map((field) => (
              <li key={field} className="flex justify-between items-center">
                <span>{field}</span>
                <button
                  onClick={() => onRemoveRestriction(field, selectedUser)}
                  className="text-sm text-red-600 hover:underline bg-red-50 px-2 py-1 rounded"
                >
                  Remove
                </button>
              </li>
            ))}
            {(!restrictedFields[selectedUser] ||
              restrictedFields[selectedUser].length === 0) && (
              <p className="text-sm text-gray-500">No restrictions yet.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FieldRestrictions;
