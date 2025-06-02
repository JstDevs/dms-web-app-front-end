import { configureStore } from "@reduxjs/toolkit";
import departmentReducer from "./slices/departmentSlice";
import userReducer from "./slices/userSlice";
import subDepartmentReducer from "./slices/subDepartmentSlice";
export const store = configureStore({
  reducer: {
    departments: departmentReducer,
    subDepartments: subDepartmentReducer,
    users: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
