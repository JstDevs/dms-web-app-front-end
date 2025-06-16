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
// export async function fetchDocuments(userId: number, page: number = 1) {
//   const response = await axios.get(
//     `/documents/documents/${userId}?page=${page}`
//   );
//   return response.data;
// }

// export async function editDocument(payload: FormData) {
//   const response = await axios.post(`/documents/edit`, payload, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
//   return response.data;
// }
