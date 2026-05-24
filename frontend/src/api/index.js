import client from "./client";

// Auth
export const login = (password) =>
  client.post("/auth/login", { password }).then((r) => r.data);

// Transactions
export const getTransactions = (params) =>
  client.get("/transactions/", { params }).then((r) => r.data);
export const createTransaction = (data) =>
  client.post("/transactions/", data).then((r) => r.data);
export const updateTransaction = (id, data) =>
  client.put(`/transactions/${id}`, data).then((r) => r.data);
export const deleteTransaction = (id) =>
  client.delete(`/transactions/${id}`);

// Categories
export const getCategories = () =>
  client.get("/categories/").then((r) => r.data);
export const createCategory = (data) =>
  client.post("/categories/", data).then((r) => r.data);
export const deleteCategory = (id) =>
  client.delete(`/categories/${id}`);

// Budgets
export const getBudgets = (month, year) =>
  client.get("/budgets/", { params: { month, year } }).then((r) => r.data);
export const upsertBudget = (data) =>
  client.post("/budgets/", data).then((r) => r.data);
export const deleteBudget = (id) =>
  client.delete(`/budgets/${id}`);

// Summary
export const getSummary = (month, year) =>
  client.get("/summary/", { params: { month, year } }).then((r) => r.data);

// NLP parse
export const parseTransaction = (text) =>
  client.post("/transactions/parse", { text }).then((r) => r.data);

// App Settings (WhatsApp / WAHA)
export const getAppSettings = () =>
  client.get("/app-settings/").then((r) => r.data);
export const updateAppSettings = (data) =>
  client.put("/app-settings/", data).then((r) => r.data);
export const testWhatsApp = () =>
  client.post("/app-settings/test-wa").then((r) => r.data);
export const sendDigest = () =>
  client.post("/app-settings/digest").then((r) => r.data);
