// redux/slices/departmentSlice.ts
import { Department } from "@/types/User";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DepartmentState {
  departments: Department[];
}

const initialState: DepartmentState = {
  departments: [],
};

const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    setDepartments(state, action: PayloadAction<Department[]>) {
      state.departments = action.payload;
    },
    addDepartment(state, action: PayloadAction<Department>) {
      state.departments.push(action.payload);
    },
    updateDepartment(state, action: PayloadAction<Department>) {
      const index = state.departments.findIndex(
        (dept) => dept.id === action.payload.id
      );
      if (index !== -1) {
        state.departments[index] = action.payload;
      }
    },
    deleteDepartment(state, action: PayloadAction<string>) {
      state.departments = state.departments.filter(
        (dept) => dept.id !== action.payload
      );
    },
  },
});

export const {
  setDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} = departmentSlice.actions;
export default departmentSlice.reducer;
