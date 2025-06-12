import axios from "@/api/axios";

export async function uploadFile(payload: FormData) {
  const response = await axios.post("/documents/create", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function fetchDocuments() {
  const response = await axios.get("/documents");
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
