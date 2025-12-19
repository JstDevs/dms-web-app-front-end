import axios from "@/api/axios";

export async function uploadFile(payload: FormData) {
  const response = await axios.post("/documents/create", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function fetchDocuments(userId: number, page: number = 1, searchTerm?: string, department?: string, subDepartment?: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({
    page: page.toString()
  });
  
  if (searchTerm) {
    params.append('search', searchTerm);
  }
  if (department) {
    params.append('department', department);
  }
  if (subDepartment) {
    params.append('subDepartment', subDepartment);
  }
  if (startDate) {
    params.append('startDate', startDate);
  }
  if (endDate) {
    params.append('endDate', endDate);
  }
  
  const response = await axios.get(
    `/documents/documents/${userId}?${params.toString()}`
  );
  return response;
}

export async function editDocument(payload: FormData) {
  const response = await axios.post(`/documents/edit`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function deleteDocument(id: number) {
  const response = await axios.delete(`/documents/delete/${id}`, {
    timeout: 30000, // 30 second timeout to prevent hanging
  });
  return response.data;
}
