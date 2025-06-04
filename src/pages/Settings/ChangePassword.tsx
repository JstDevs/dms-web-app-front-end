import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftCircle, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { changePassword } from "@/api/auth";

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const togglePassword = (field: "current" | "new" | "confirm") => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("Please fill out all fields");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      await changePassword(form.currentPassword, form.newPassword);
      toast.success("Password updated successfully!");
      navigate("/settings");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const renderPasswordInput = (
    label: string,
    name: "currentPassword" | "newPassword" | "confirmPassword",
    showKey: "current" | "new" | "confirm"
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword[showKey] ? "text" : "password"}
          name={name}
          value={form[name]}
          onChange={handleChange}
          className="block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-10"
        />
        <button
          type="button"
          onClick={() => togglePassword(showKey)}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
        >
          {showPassword[showKey] ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in bg-white rounded-lg shadow-sm border border-gray-100">
      <button
        onClick={() => navigate("/settings")}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition"
      >
        <ArrowLeftCircle className="h-5 w-5 mr-2" />
        <span className="text-sm font-medium">Back to Settings</span>
      </button>

      <h1 className="text-3xl font-bold text-blue-800 mb-4">Change Password</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {renderPasswordInput("Current Password", "currentPassword", "current")}
        {renderPasswordInput("New Password", "newPassword", "new")}
        {renderPasswordInput(
          "Confirm New Password",
          "confirmPassword",
          "confirm"
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
        >
          Update Password
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
