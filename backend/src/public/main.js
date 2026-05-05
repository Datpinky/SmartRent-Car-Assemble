import { login, logout, isLoggedIn } from "./auth.js";
import axiosClient from "./axiosClient.js";

const api = axiosClient;




function renderUI() {
  const loginSection = document.getElementById("loginSection");
  const appSection = document.getElementById("appSection");
  if (isLoggedIn()) {
    loginSection.style.display = "none";
    appSection.style.display = "block";
  } else {
    loginSection.style.display = "block";
    appSection.style.display = "none";
  }
}

async function handleLogin() {
  try {
    await login("admin@gmail.com", "123456");
    renderUI();
  } catch (err) {
    console.error("Login error:", err);
  }
}

async function getBookings() {
  const res = await api.post("/booking/getListBookings");
  console.log("Bookings:", res);
}

async function getPayments() {
  const res = await api.post("/payment/getListPayments");
  console.log("Payments:", res);
}



function handleLogout() {
  logout();
  renderUI();
}




document.addEventListener("DOMContentLoaded", () => {
  renderUI();
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("bookingBtn").addEventListener("click", getBookings);
  document.getElementById("paymentBtn").addEventListener("click", getPayments);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);



  document.getElementById("createPaymentBtn").addEventListener("click", () => {
    const bookingId = document.getElementById("bookingIdInput").value;
    if (!bookingId) {
      alert("Vui lòng nhập bookingId");
      return;
    }
    // chuyển sang checkout.html và truyền bookingId qua query string
    window.location.href = `checkout.html?bookingId=${encodeURIComponent(bookingId)}`;
    localStorage.setItem("bookingId", bookingId);
  });
});
