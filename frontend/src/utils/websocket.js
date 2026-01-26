import { io } from "socket.io-client";

let socket = null;

/**
 * Kapcsolódás a WebSocket-szerverhez (Socket.IO).
 * Ha már létezik csatlakozás, visszatérünk a létező socket-tel.
 */
export function connectWebSocket(roomId, playerName) {
  if (socket && socket.connected) {
    console.log("🔄 WebSocket már csatlakoztatva:", socket.id);
    return socket;
  }

  console.log("📡 WebSocket csatlakozás...");

  // Socket.IO kliens csatlakozás
  socket = io("http://localhost:3001", {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("✅ WebSocket kapcsolódva:", socket.id);
    // Azonnal join-olunk a szobához a megadott playerName-mel
    socket.emit("join_room", { roomId, playerName });
  });

  socket.on("disconnect", (reason) => {
    console.log(`⚠️ WebSocket kapcsolat megszakadt: ${reason}`);
  });

  socket.on("connect_error", (error) => {
    console.log("❌ WebSocket hiba:", error);
  });

  return socket;
}

/**
 * Visszaadjuk a létező socketet (ha már inicializálták).
 */
export function getSocket() {
  return socket;
}

/**
 * Bontjuk a WebSocket kapcsolatot.
 */
export function disconnectWebSocket() {
  if (socket) {
    console.log("❌ WebSocket kapcsolat lezárva (FRONTEND)");
    socket.disconnect();
    socket = null;
  }
}

/**
 * Egyszerű chat-üzenet küldése.
 */
export function sendWebSocketMessage(roomId, playerName, message) {
  if (!socket || !socket.connected) {
    console.warn("⚠️ WebSocket nem elérhető, üzenet nem küldhető.");
    return;
  }
  socket.emit("send_message", { roomId, playerName, message });
}

/**
 * Kártyára húzás (hoverOnCard) küldése a szervernek.
 * A szerver a RabbitMQ-n keresztül továbbítja mindenki felé.
export function sendHoverOnCard(roomId, cardContainerID, color, playerName) {
  const s = getSocket();
  if (s && s.connected) {
    s.emit("hoverOnCard", { roomId, cardContainerID, color, playerName });
  }
}
*/

/**
 * Kártyáról elvitel (hoverOffCard) küldése a szervernek.
export function sendHoverOffCard(roomId, cardContainerID, playerName) {
  const s = getSocket();
  if (s && s.connected) {
    s.emit("hoverOffCard", { roomId, cardContainerID, playerName });
  }
}
*/


export const sendHoverOnCard = (roomId, cardContainerID, color, playerName) => {
  const socket = getSocket();
  if (socket) {
    console.log(`📤 Küldés -> hoverOnCard: ${playerName} -> ${cardContainerID}, color=${color}`);
    socket.emit("hoverOnCard", { roomId, cardContainerID, color, playerName });
  }
};

export const sendHoverOffCard = (roomId, cardContainerID, playerName) => {
  const socket = getSocket();
  if (socket) {
    console.log(`📤 Küldés -> hoverOffCard: ${playerName} -> ${cardContainerID}`);
    socket.emit("hoverOffCard", { roomId, cardContainerID, playerName });
  }
};


export function sendCardToReveal(roomId, cardContainerID) {
  const socket = getSocket();
  if (socket && socket.connected) {
    console.log(`📤 sendCardToReveal -> ${cardContainerID}`);
    socket.emit("card_to_reveal", { roomId, cardContainerID });
  }
};

export function sendHideRevealedCard(roomId, cardContainerID) {
  const socket = getSocket();
  if (socket && socket.connected) {
    console.log(`📤 sendHideRevealedCard -> ${cardContainerID}`);
    socket.emit("card_to_hide", { roomId, cardContainerID });
  }
};

export const sendNextTurn = (roomId, nextPlayer) => {
  const socket = getSocket();
  if (socket) {
    console.log(`📤 Küldés -> nextTurn: ${nextPlayer} (room: ${roomId})`);
    socket.emit("nextTurn", { roomId, nextPlayer });
  }
};

export function sendDrawCard(roomId, nthCardInDeck, playerName) {
  const socket = getSocket();
  if (socket) {
    console.log(`📤 Küldés -> drawCard: ${playerName} -> ${nthCardInDeck}`);
    socket.emit("drawCard", { roomId, nthCardInDeck, playerName });
  }
}