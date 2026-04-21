// ws.js
const hamBurger = document.querySelector(".toggle-btn");

hamBurger.addEventListener("click", function () {
  document.querySelector("#sidebar").classList.toggle("expand");
});

// ==========================
// WEBSOCKET HANDLER
// ==========================
const WS_URL = "ws://" + window.location.hostname + ":8082";
export const ws = new WebSocket(WS_URL);

ws.addEventListener("open", () => {
  console.log("WebSocket connected");
});

ws.addEventListener("error", err => {
  console.error("WS error", err);
});
