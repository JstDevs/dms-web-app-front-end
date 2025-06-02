import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type SubDepartmentType = {
  id: string;
  name: string;
  departmentId: string;
};

type SubDepartmentState = {
  subDepartments: SubDepartmentType[];
};

const initialState: SubDepartmentState = {
  subDepartments: [],
};

const subDepartmentsSlice = createSlice({
  name: "subDepartments",
  initialState,
  reducers: {
    setSubDepartments: (state, action: PayloadAction<SubDepartmentType[]>) => {
      state.subDepartments = action.payload;
    },
    addSubDepartment: (state, action: PayloadAction<SubDepartmentType>) => {
      state.subDepartments.push(action.payload);
    },
    removeSubDepartment: (state, action: PayloadAction<string>) => {
      state.subDepartments = state.subDepartments.filter(
        (subDept) => subDept.id !== action.payload
      );
    },
    updateSubDepartment: (state, action: PayloadAction<SubDepartmentType>) => {
      const index = state.subDepartments.findIndex(
        (subDept) => subDept.id === action.payload.id
      );
      if (index !== -1) {
        state.subDepartments[index] = action.payload;
      }
    },
  },
});

export const {
  setSubDepartments,
  addSubDepartment,
  removeSubDepartment,
  updateSubDepartment,
} = subDepartmentsSlice.actions;

export default subDepartmentsSlice.reducer;
