require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const rooms = require("./roomsData.js");
const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");

const {
  connectBroker,
  publishHoverOnCard,
  publishHoverOffCard,
  subscribeToRoomEvent,
  publishCardToReveal,
  publishCardToHide,
  publishNextTurn,
  publishDrawCard,
} = require("./broker");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);
app.use("/api", roomRoutes);

app.get("/", (req, res) => {
  res.send("Backend OK");
});

connectBroker().catch((err) => {
  console.log("Broker init failed:", err?.message || err);
});

const socketToUser = {};

function createStringDeck() {
  const deck = [
    "2H","3H","4H","5H","6H","7H","8H","9H","10H","JH","QH","KH","AH",
    "2D","3D","4D","5D","6D","7D","8D","9D","10D","JD","QD","KD","AD",
    "2C","3C","4C","5C","6C","7C","8C","9C","10C","JC","QC","KC","AC",
    "2S","3S","4S","5S","6S","7S","8S","9S","10S","JS","QS","KS","AS"
  ];
  return deck.sort(() => Math.random() - 0.5);
}

function startGame(roomId) {
  if (!rooms[roomId]) return;

  const gameRoomId = `game_${roomId}`;
  const deck = createStringDeck();

  rooms[gameRoomId] = {
    players: [...rooms[roomId].players],
    deck,
    hands: {},
    turnIndex: 0,
    discardPile: [],
    nthCardInDeck: deck.length - 1,
  };

  rooms[gameRoomId].players.forEach((player) => {
    rooms[gameRoomId].hands[player] = rooms[gameRoomId].deck.splice(0, 4);
  });

  rooms[gameRoomId].turnIndex = Math.floor(
    Math.random() * rooms[gameRoomId].players.length
  );

  rooms[gameRoomId].nthCardInDeck = rooms[gameRoomId].deck.length - 1;

  io.to(roomId).emit("gameStarted", {
    gameRoomId,
    players: rooms[gameRoomId].players,
    hands: rooms[gameRoomId].hands,
    turnIndex: rooms[gameRoomId].turnIndex,
    deckSize: rooms[gameRoomId].deck.length,
    discardPile: rooms[gameRoomId].discardPile,
  });

  console.log("Game started:", gameRoomId);
}

io.on("connection", (socket) => {
  console.log("WebSocket connected:", socket.id);

  socket.on("join_room", ({ roomId, playerName }) => {
    if (!rooms[roomId]) return;

    socketToUser[socket.id] = { roomId, playerName };
    socket.join(roomId);

    if (!rooms[roomId].players.includes(playerName)) {
      rooms[roomId].players.push(playerName);
    }

    io.to(roomId).emit("userJoined", {
      roomId,
      players: rooms[roomId].players,
    });

    subscribeToRoomEvent(roomId, "hoverOnCard", (data) => {
      io.to(roomId).emit("hoverOnCardUpdate", data);
    });

    subscribeToRoomEvent(roomId, "hoverOffCard", (data) => {
      io.to(roomId).emit("hoverOffCardUpdate", data);
    });

    subscribeToRoomEvent(roomId, "cardToReveal", (data) => {
      io.to(roomId).emit("cardToRevealUpdate", data);
    });

    subscribeToRoomEvent(roomId, "cardToHide", (data) => {
      io.to(roomId).emit("cardToHideUpdate", data);
    });

    subscribeToRoomEvent(roomId, "nextTurn", (data) => {
      io.to(roomId).emit("nextTurnUpdate", data);
    });

    subscribeToRoomEvent(roomId, "drawCard", (data) => {
      io.to(roomId).emit("drawCardUpdate", data);
    });
  });

  socket.on("send_message", ({ roomId, playerName, message }) => {
    io.to(roomId).emit("receiveMessage", { playerName, message });
  });

  socket.on("join_voice_chat", ({ roomId, playerName }) => {
    socket.join(roomId);
    console.log("Voice chat join:", playerName, roomId);
  });

  socket.on("ice_candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice_candidate", { candidate });
  });

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", { offer });
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("player_ready", ({ roomId, playerName }) => {
    if (!rooms[roomId]) return;

    if (!rooms[roomId].readyPlayers) rooms[roomId].readyPlayers = [];
    if (!rooms[roomId].readyPlayers.includes(playerName)) {
      rooms[roomId].readyPlayers.push(playerName);
    }

    io.to(roomId).emit("playerReady", {
      playerName,
      readyPlayers: rooms[roomId].readyPlayers,
    });

    if (rooms[roomId].readyPlayers.length === rooms[roomId].players.length) {
      startGame(roomId);
    }
  });

  socket.on("drawCard", ({ roomId, nthCardInDeck, playerName }) => {
    const room = rooms[roomId];
    if (!room || !Array.isArray(room.deck) || room.deck.length === 0) return;

    const idx = Number(nthCardInDeck);
    if (!Number.isFinite(idx) || idx < 0 || idx >= room.deck.length) return;

    const drawnCard = room.deck[idx];

    socket.emit("cardDrawn", { card: drawnCard, nthCardInDeck: idx });

    room.nthCardInDeck = idx - 1;

    io.to(roomId).emit("updateGameState", room);

    publishDrawCard(roomId, idx, playerName);
  });

  socket.on("discardCard", ({ roomId, playerName, card }) => {
    const room = rooms[roomId];
    if (!room || !room.hands?.[playerName]) return;

    room.hands[playerName] = room.hands[playerName].filter((c) => c !== card);
    room.discardPile.push(card);

    io.to(roomId).emit("updateGameState", room);
  });

  socket.on("endTurn", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !Array.isArray(room.players) || room.players.length === 0) return;

    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    io.to(roomId).emit("updateGameState", room);
  });

  socket.on("hoverOnCard", ({ roomId, cardContainerID, color, playerName }) => {
    publishHoverOnCard(roomId, cardContainerID, color, playerName);
  });

  socket.on("hoverOffCard", ({ roomId, cardContainerID, playerName }) => {
    publishHoverOffCard(roomId, cardContainerID, playerName);
  });

  socket.on("card_to_reveal", ({ roomId, cardContainerID }) => {
    const userData = socketToUser[socket.id];
    if (!userData) return;
    publishCardToReveal(roomId, cardContainerID, userData.playerName);
  });

  socket.on("card_to_hide", ({ roomId, cardContainerID }) => {
    const userData = socketToUser[socket.id];
    if (!userData) return;
    publishCardToHide(roomId, cardContainerID, userData.playerName);
  });

  socket.on("nextTurn", ({ roomId, nextPlayer }) => {
    publishNextTurn(roomId, nextPlayer);
  });

  socket.on("disconnect", () => {
    const userData = socketToUser[socket.id];
    if (!userData) return;

    const { roomId, playerName } = userData;
    if (rooms[roomId]) {
      rooms[roomId].players = rooms[roomId].players.filter((p) => p !== playerName);
      io.to(roomId).emit("userLeft", {
        roomId,
        players: rooms[roomId].players,
      });
    }

    delete socketToUser[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`HTTP server listening on ${PORT}`);
});
