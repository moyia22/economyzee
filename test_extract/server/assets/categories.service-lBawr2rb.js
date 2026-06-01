import { x as api } from "./router-BxZ3CosB.js";
async function getCategories() {
  return await api.get("/categories");
}
async function createCategory(data) {
  return await api.post("/categories", data);
}
async function updateCategory(id, data) {
  return await api.patch(`/categories/${id}`, data);
}
async function deleteCategory(id) {
  return await api.delete(`/categories/${id}`);
}
export {
  createCategory as c,
  deleteCategory as d,
  getCategories as g,
  updateCategory as u
};
