import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import { fetchDepartments } from '@/redux/thunk/DepartmentThunk';
import { fetchSubDepartments } from '@/redux/thunk/SubdepartmentThunk';
// import { fetchSubDepartments } from "@/redux/thunk/SubDepartmentThunk"; // replace with your actual thunk

export const useDepartmentOptions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const departments = useSelector(
    (state: RootState) => state.departments.items
  );
  const subDepartments = useSelector(
    (state: RootState) => state.subDepartments.items
  );

  useEffect(() => {
    dispatch(fetchDepartments());
    dispatch(fetchSubDepartments());
  }, [dispatch, departments.length, subDepartments.length]);

  const departmentOptions = departments.map((dept) => ({
    value: String(dept.ID),
    label: dept.Name,
  }));

  const subDepartmentOptions = subDepartments.map((sub) => ({
    value: String(sub.ID),
    label: sub.Name,
  }));

  return { departmentOptions, subDepartmentOptions };
};
