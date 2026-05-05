import axiosClient from "./axiosClient.js";

const api = axiosClient;
export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", res.token);
  localStorage.setItem("user", JSON.stringify(res.user));
  return res;
}

export function logout() {
  localStorage.removeItem("token");
}

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

