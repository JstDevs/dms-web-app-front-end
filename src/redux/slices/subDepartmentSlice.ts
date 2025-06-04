import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SubDepartment } from "@/types/Departments";
import {
  createSubDepartment,
  deleteSubDepartment,
  editSubDepartment,
  fetchSubDepartments,
} from "../thunk/SubdepartmentThunk";

interface SubDepartmentState {
  items: SubDepartment[];
  loading: boolean;
}

const initialState: SubDepartmentState = {
  items: [],
  loading: false,
};

const subDepartmentSlice = createSlice({
  name: "subDepartments",
  initialState,
  reducers: {
    resetSubDepartments: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubDepartments.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchSubDepartments.fulfilled,
        (state, action: PayloadAction<SubDepartment[]>) => {
          state.items = action.payload;
          state.loading = false;
        }
      )
      .addCase(fetchSubDepartments.rejected, (state) => {
        state.loading = false;
      })
      .addCase(
        createSubDepartment.fulfilled,
        (state, action: PayloadAction<SubDepartment>) => {
          state.items.push(action.payload);
        }
      )
      .addCase(editSubDepartment.fulfilled, (state, action) => {
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
      .addCase(deleteSubDepartment.fulfilled, (state, action) => {
        const idToDelete = action.payload;
        state.items = state.items.filter((item) => item.ID !== idToDelete);
      });
  },
});

export const { resetSubDepartments } = subDepartmentSlice.actions;
export default subDepartmentSlice.reducer;
