import { io } from "socket.io-client";

let socket = null;

export function connectWebSocket(roomId, playerName) {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io("http://localhost:5000", {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    socket.emit("join_room", { roomId, playerName });
  });

  /*
  socket.on("disconnect", (reason) => {
    console.log(`WebS kapcsolat megszakadt hiba(debug): ${reason}`);
  });

  socket.on("connect_error", (error) => {
    console.log("WebS hiba (debug):", error);
  });

  */

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function sendWebSocketMessage(roomId, playerName, message) {
  if (!socket || !socket.connected) return;
  socket.emit("send_message", { roomId, playerName, message });
}

export function sendHoverOnCard(roomId, cardContainerID, color, playerName) {
  const s = getSocket();
  if (!s || !s.connected) return;
  s.emit("hoverOnCard", { roomId, cardContainerID, color, playerName });
}

export function sendHoverOffCard(roomId, cardContainerID, playerName) {
  const s = getSocket();
  if (!s || !s.connected) return;
  s.emit("hoverOffCard", { roomId, cardContainerID, playerName });
}

export function sendCardToReveal(roomId, cardContainerID) {
  const s = getSocket();
  if (!s || !s.connected) return;
  s.emit("card_to_reveal", { roomId, cardContainerID });
}

export function sendHideRevealedCard(roomId, cardContainerID) {
  const s = getSocket();
  if (!s || !s.connected) return;
  s.emit("card_to_hide", { roomId, cardContainerID });
}

export function sendNextTurn(roomId, nextPlayer) {
  const s = getSocket();
  if (!s || !s.connected) return;
  s.emit("nextTurn", { roomId, nextPlayer });
}

export function sendDrawCard(roomId, nthCardInDeck, playerName) {
  const s = getSocket();
  if (!s || !s.connected) return;
  s.emit("drawCard", { roomId, nthCardInDeck, playerName });
}