import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Department } from "@/types/Departments";
import {
  createDepartment,
  deleteDepartment,
  editDepartment,
  fetchDepartments,
} from "../thunk/DepartmentThunk";

interface DepartmentState {
  items: Department[];
  loading: boolean;
}

const initialState: DepartmentState = {
  items: [],
  loading: false,
};

const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    resetDepartments: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchDepartments.fulfilled,
        (state, action: PayloadAction<Department[]>) => {
          state.items = action.payload;
          state.loading = false;
        }
      )
      .addCase(fetchDepartments.rejected, (state) => {
        state.loading = false;
      })
      .addCase(
        createDepartment.fulfilled,
        (state, action: PayloadAction<Department>) => {
          state.items.push(action.payload);
        }
      )
      .addCase(editDepartment.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.items.findIndex((item) => item.ID === updated.ID);
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            Name: updated.Name,
            Code: updated.Code,
          };
        }
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        const idToDelete = action.payload;
        state.items = state.items.filter((item) => item.ID !== idToDelete);
      });
  },
});

export const { resetDepartments } = departmentSlice.actions;
export default departmentSlice.reducer;
