import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Department } from '@/types/Departments';
import {
  createDepartment,
  deleteDepartment,
  editDepartment,
  fetchDepartments,
} from '../thunk/DepartmentThunk';

interface DepartmentState {
  items: Department[];
  loading: boolean;
  error: string | null;
}

const initialState: DepartmentState = {
  items: [],
  loading: false,
  error: null,
};

const departmentSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    resetDepartments: (state) => {
      state.items = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Departments
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDepartments.fulfilled,
        (state, action: PayloadAction<Department[]>) => {
          state.items = action.payload;
          state.loading = false;
        }
      )
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch departments';
      })

      // Create Department
      .addCase(createDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createDepartment.fulfilled,
        (state, action: PayloadAction<Department>) => {
          state.items.push(action.payload);
          state.loading = false;
        }
      )
      .addCase(createDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create department';
      })

      // Edit Department
      .addCase(editDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(editDepartment.fulfilled, (state, action: any) => {
        const updated = action.payload;
        const index = state.items.findIndex((item) => item.ID === updated.ID);
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            Name: updated.Name,
            Code: updated.Code,
          };
        }
        state.loading = false;
      })
      .addCase(editDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to edit department';
      })

      // Delete Department
      .addCase(deleteDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteDepartment.fulfilled,
        (state, action: PayloadAction<number>) => {
          const idToDelete = action.payload;
          state.items = state.items.filter((item) => item.ID !== idToDelete);
          state.loading = false;
        }
      )
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete department';
      });
  },
});

export const { resetDepartments, clearError } = departmentSlice.actions;
export default departmentSlice.reducer;
