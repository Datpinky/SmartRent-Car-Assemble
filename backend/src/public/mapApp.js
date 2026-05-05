// mapApp.js
import axiosClient from "./axiosClient.js";

const api = axiosClient;

let map;
let marker;

function showMarker(lat, lon, label) {
  console.log("showMarker called with:", lat, lon, label);
  if (!map) {
    console.error("Map chưa khởi tạo!");
    return;
  }
  if (marker) {
    console.log("Xóa marker cũ");
    map.removeLayer(marker);
  }
  marker = L.marker([parseFloat(lat), parseFloat(lon)])
    .addTo(map)
    .bindPopup(label)
    .openPopup();
  map.setView([parseFloat(lat), parseFloat(lon)], 15);
}

export function initMap() {
  map = L.map("map").setView([16.0678, 108.2208], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Forward
  document.getElementById("forwardBtn").onclick = async () => {
    const address = document.getElementById("forwardInput").value;
    const data = await api.get(`map/forwardGeocode?address=${encodeURIComponent(address)}`);
    console.log("Data:", data);
    if (data?.[0]) {
      const loc = data[0];
      showMarker(parseFloat(loc.lat), parseFloat(loc.lon), loc.display_name);
    }
  };

  // Reverse
  document.getElementById("reverseBtn").onclick = async () => {
    const lat = document.getElementById("latInput").value;
    const lon = document.getElementById("lonInput").value;
    const data = await api.get(`map/reverseGeocode?lat=${lat}&lon=${lon}`);
    if (data) {
      console.log("Data:", data);
      const loc = data;
      console.log("Location:", loc);
      showMarker(parseFloat(loc.lat), parseFloat(loc.lon), loc.display_name);
    }
  };

  // Autocomplete
  document.getElementById("autocompleteInput").oninput = async (e) => {
    const input = e.target.value;
    const list = document.getElementById("autocompleteResults");
    list.innerHTML = "";
    if (!input) return;

    const data = await api.get(`map/placeAutocomplete?input=${encodeURIComponent(input)}`);
    if (data) {
      data.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.display_name;
        li.onclick = () => {
          document.getElementById("forwardInput").value = item.display_name;
          showMarker(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
        };
        list.appendChild(li);
      });
    }
  };
}
