import axios from '@/api/axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { SubDepartment } from '@/types/Departments';

export const fetchSubDepartments = createAsyncThunk(
  'subDepartments/fetch',
  async () => {
    const { data } = await axios.get('/subdepartments');
    return data.list as SubDepartment[];
  }
);

export const createSubDepartment = createAsyncThunk(
  'subDepartments/create',
  async (payload: { name: string; code: string; departmentId: number }) => {
    const { data } = await axios.post('/subdepartments/create', {
      Name: payload.name,
      Code: payload.code,
      DepartmentID: payload.departmentId,
    });
    return data;
  }
);
// Edit SubDepartment
export const editSubDepartment = createAsyncThunk(
  'subDepartments/edit',
  async (
    {
      id,
      name,
      code,
      departmentId,
    }: { id: number; name: string; code: string; departmentId: string },
    { rejectWithValue }
  ) => {
    try {
      await axios.post(`/subdepartments/edit/${id}`, {
        Name: name,
        Code: code,
        DepartmentID: departmentId,
      });
      return { ID: id, Name: name, Code: code }; // return updated object
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data || 'Failed to edit sub-department'
      );
    }
  }
);

// Delete SubDepartment
export const deleteSubDepartment = createAsyncThunk(
  'subDepartments/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axios.get(`/subdepartments/delete/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data || 'Failed to delete sub-department'
      );
    }
  }
);
