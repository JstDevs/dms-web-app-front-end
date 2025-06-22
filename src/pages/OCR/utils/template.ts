import axios from "@/api/axios";

export async function createTemplate(payload: FormData) {
  const response = await axios.post("/templates", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
// TODO fetch Templates
export async function fetchTemplates() {
  const response = await axios.get(`/templates`);
  return response.data;
}
export async function deleteTemplate(templateID: number) {
  const response = await axios.delete(`/templates/${templateID}`);
  return response.data;
}

export async function updateTemplate(templateID: number, payload: FormData) {
  const response = await axios.put(`/templates/${templateID}`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
