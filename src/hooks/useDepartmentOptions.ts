import { useEffect, useMemo } from 'react';
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
    // Only fetch if we don't have data yet
    if (departments.length === 0) {
      dispatch(fetchDepartments());
    }
    if (subDepartments.length === 0) {
      dispatch(fetchSubDepartments());
    }
  }, [dispatch, departments.length, subDepartments.length]);

  const departmentOptions = useMemo(() => 
    departments.map((dept) => ({
      value: String(dept.ID),
      label: dept.Name,
    })), [departments]
  );

  const subDepartmentOptions = useMemo(() => 
    subDepartments.map((sub) => ({
      value: String(sub.ID),
      label: sub.Name,
    })), [subDepartments]
  );

  return { departmentOptions, subDepartmentOptions };
};
