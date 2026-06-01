import { x as api } from "./router-BxZ3CosB.js";
async function getAccounts() {
  return api.get("/accounts");
}
async function createAccount(data) {
  return api.post("/accounts", data);
}
async function deleteAccount(id) {
  return api.delete(`/accounts/${id}`);
}
export {
  createAccount as c,
  deleteAccount as d,
  getAccounts as g
};
