import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import { fetchDepartments } from '@/redux/thunk/DepartmentThunk';

export const useNestedDepartmentOptions = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Assuming your Redux store now has a nested structure
  const {
    items: departments,
    loading,
    error,
  } = useSelector((state: RootState) => state.departments);

  useEffect(() => {
    if (departments.length === 0) {
      dispatch(fetchDepartments());
    }
  }, [dispatch, departments.length]);

  // Memoize department options for performance
  const departmentOptions = useMemo(() => {
    return departments.map((dept) => ({
      value: String(dept.ID),
      label: dept.Name,
    }));
  }, [departments]);

  // Function to get sub-department options for a specific department
  const getSubDepartmentOptions = (departmentId: number) => {
    const department = departments.find((dept) => dept.ID === departmentId);
    if (!department || !department.SubDepartments) return [];

    return department.SubDepartments.map((subDept) => ({
      value: String(subDept.ID),
      label: subDept.Name,
    }));
  };

  return {
    departmentOptions,
    getSubDepartmentOptions,
    loading,
    error,
  };
};
