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

const voiceMembers = new Map();

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

  const players = [...rooms[roomId].players];
  const CARDS_PER_PLAYER = 6;

  rooms[gameRoomId] = {
    players,
    deck,
    hands: {},
    discardPile: [],
    dealerIndex: 0,
    turnIndex: 0,
  };

  for (const p of players) {
    rooms[gameRoomId].hands[p] = rooms[gameRoomId].deck.splice(0, CARDS_PER_PLAYER);
  }

  const dealerIndex = Math.floor(Math.random() * players.length);
  const turnIndex = (dealerIndex + 1) % players.length;

  rooms[gameRoomId].dealerIndex = dealerIndex;
  rooms[gameRoomId].turnIndex = turnIndex;

  rooms[gameRoomId].currentTurn = players[turnIndex];
  rooms[gameRoomId].pendingDraw = {};


  io.to(roomId).emit("gameStarted", {
    gameRoomId,
    players,
    dealerIndex,
    turnIndex,
    currentTurn: rooms[gameRoomId].currentTurn,
    deckSize: rooms[gameRoomId].deck.length,
    discardPile: rooms[gameRoomId].discardPile,
    cardsPerPlayer: CARDS_PER_PLAYER,
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

    const members = voiceMembers.get(roomId) || [];

    if (!members.includes(socket.id)) members.push(socket.id);
    voiceMembers.set(roomId, members);

    console.log("Csatlakozas a voice chathez:", playerName, roomId);

    if (members.length === 2) {
      io.to(roomId).emit("webrtc_ready", { roomId, initiatorId: members[0] });
    }
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

  socket.on("drawCard", ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room || !Array.isArray(room.deck) || room.deck.length === 0) return;

    if (room.currentTurn && room.currentTurn !== playerName) return;

    if (!room.pendingDraw) room.pendingDraw = {};
    if (room.pendingDraw[playerName]) return;

    const card = room.deck.pop();
    room.pendingDraw[playerName] = card;

    socket.emit("cardDrawn", { card });

    io.to(roomId).emit("deckSizeUpdate", { deckSize: room.deck.length });
    io.to(roomId).emit("playerDrewCard", { playerName });

    publishDrawCard(roomId, room.deck.length, playerName);
  });

  socket.on("discardDrawnCard", ({ roomId }) => {
    const userData = socketToUser[socket.id];
    if (!userData) return;

    const room = rooms[roomId];
    if (!room || !room.pendingDraw) return;

    const player = userData.playerName;
    if (room.currentTurn && room.currentTurn !== player) return;

    const drawn = room.pendingDraw[player];
    if (!drawn) return;

    room.discardPile.push(drawn);
    room.pendingDraw[player] = null;

    io.to(roomId).emit("discardTopUpdate", { card: drawn });
    io.to(roomId).emit("deckSizeUpdate", { deckSize: room.deck.length });

    socket.emit("clearDrawnCard");

    const idx = room.players.indexOf(room.currentTurn);
    const next = room.players[(idx + 1) % room.players.length];
    room.currentTurn = next;
    if (room.pendingDraw) room.pendingDraw[next] = null;

    io.to(roomId).emit("nextTurnUpdate", { roomId, nextPlayer: next });
    publishNextTurn(roomId, next);
  });

  socket.on("swapDrawnWithHand", ({ roomId, handIndex }) => {
    const userData = socketToUser[socket.id];
    if (!userData) return;

    const room = rooms[roomId];
    if (!room || !room.pendingDraw || !room.hands) return;

    const player = userData.playerName;
    if (room.currentTurn && room.currentTurn !== player) return;

    const drawn = room.pendingDraw[player];
    if (!drawn) return;

    const idx = Number(handIndex);
    if (!Number.isInteger(idx)) return;

    const hand = room.hands[player];
    if (!Array.isArray(hand) || idx < 0 || idx >= hand.length) return;

    const oldCard = hand[idx];
    hand[idx] = drawn;

    room.discardPile.push(oldCard);
    room.pendingDraw[player] = null;

    io.to(roomId).emit("discardTopUpdate", { card: oldCard });
    io.to(roomId).emit("deckSizeUpdate", { deckSize: room.deck.length });

    socket.emit("clearDrawnCard");
    socket.emit("handCardReset", { cardContainerID: `${player}-${idx}` });

    const t = room.players.indexOf(room.currentTurn);
    const next = room.players[(t + 1) % room.players.length];
    room.currentTurn = next;
    if (room.pendingDraw) room.pendingDraw[next] = null;

    io.to(roomId).emit("nextTurnUpdate", { roomId, nextPlayer: next });
    publishNextTurn(roomId, next);
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
    room.currentTurn = room.players[room.turnIndex];

    if (room.pendingDraw){
      room.pendingDraw[room.currentTurn] = null;
    } 

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

    const room = rooms[roomId];
    if (room && room.hands && typeof cardContainerID === "string") {
      const dash = cardContainerID.lastIndexOf("-");
      if (dash > 0) {
        const owner = cardContainerID.slice(0, dash);
        const idx = Number(cardContainerID.slice(dash + 1));

        if (owner === userData.playerName && Number.isInteger(idx)) {
          const card = room.hands[owner]?.[idx];
          if (card) {
            socket.emit("revealCard", { cardContainerID, card });
          }
        }
      }
    }

    publishCardToReveal(roomId, cardContainerID, userData.playerName);
  });


  socket.on("card_to_hide", ({ roomId, cardContainerID }) => {
    const userData = socketToUser[socket.id];
    if (!userData) return;
    publishCardToHide(roomId, cardContainerID, userData.playerName);
  });

  socket.on("nextTurn", ({ roomId, nextPlayer }) => {
    const room = rooms[roomId];
    if (room) {
      room.currentTurn = nextPlayer;
      if (room.pendingDraw) room.pendingDraw[nextPlayer] = null;
    }
    publishNextTurn(roomId, nextPlayer);
  });


  socket.on("disconnect", () => {
    const userData = socketToUser[socket.id];
    if (!userData){
      return;
    }

    for (const [rid, members] of voiceMembers.entries()) {
      const next = members.filter((id) => id !== socket.id);
      
      if (next.length === 0) voiceMembers.delete(rid);
      else voiceMembers.set(rid, next);
    }

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
