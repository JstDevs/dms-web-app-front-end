import axios from '@/api/axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Department } from '@/types/Departments';

// Fetch Departments
export const fetchDepartments = createAsyncThunk(
  'departments/fetch',
  async () => {
    const { data } = await axios.get('/department');
    return data.departments as Department[];
  }
);

// Create Department
export const createDepartment = createAsyncThunk(
  'departments/create',
  async (payload: { name: string; code: string }) => {
    const { data } = await axios.post('/department/create', {
      Name: payload.name,
      Code: payload.code,
    });
    return data;
  }
);

// Edit Department
export const editDepartment = createAsyncThunk(
  'departments/edit',
  async (
    { id, name, code }: { id: number; name: string; code: string },
    { rejectWithValue }
  ) => {
    try {
      await axios.post(`/department/edit`, {
        Id: id,
        Name: name,
        Code: code,
      });
      return { ID: id, Name: name, Code: code };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Failed to edit department');
    }
  }
);

// Delete Department
export const deleteDepartment = createAsyncThunk(
  'departments/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axios.get(`/department/delete/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data || 'Failed to delete department'
      );
    }
  }
);
