import axios from "@/api/axios";

export async function uploadFile(payload: FormData) {
  const response = await axios.post("/documents/create", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function fetchDocuments(userId: number, page: number = 1) {
  const response = await axios.get(
    `/documents/documents/${userId}?page=${page}`
  );
  return response.data;
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
  const response = await axios.delete(`/documents/delete/${id}`);
  return response.data;
}
