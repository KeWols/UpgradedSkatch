require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { connectBroker } = require("./broker");
const rooms = require("./roomsData.js"); // Közös memóriastruktúra
const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");

const { createDeck, shuffleDeck } = require("./utils/deck");

//broker eszközök
const {
  publishHoverOnCard,
  publishHoverOffCard,
  subscribeToRoomEvent,
  publishCardToReveal,  
  publishCardToHide,
  publishNextTurn,
  subscribeDrawCard,
  publishDrawCard
} = require("./broker"); 

const { createShuffledDeck } = require("./utils/deck");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;
const WS_PORT = 3001;

app.use(cors());
app.use(express.json());

// Routerek
app.use("/users", userRoutes);
app.use("/api", roomRoutes);

// Egyszerű teszt-endpoint
app.get("/", (req, res) => {
  res.send("Backend OK!");
});

// RabbitMQ init
connectBroker();

// Eltároljuk: socket.id -> { roomId, playerName }
const socketToUser = {};

/* ================= Socket.IO események ================= */
io.on("connection", (socket) => {
  console.log(`✅ WebSocket kapcsolódott: ${socket.id}`);

  // ============= JOIN_ROOM =============
  socket.on("join_room", ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      console.log("❌ join_room hiba: a szoba nem létezik", roomId);
      return;
    }

    socketToUser[socket.id] = { roomId, playerName };
    socket.join(roomId);

    if (!rooms[roomId].players.includes(playerName)) {
      rooms[roomId].players.push(playerName);
    }

    console.log(`${playerName} csatlakozott a(z) ${roomId} szobához (socket: ${socket.id})`);

    // Szoba állapot frissítés
    io.to(roomId).emit("userJoined", {
      roomId,
      players: rooms[roomId].players,
    });

    //FELIRATKOZASOK ----------------------------------------------------------------------------------------

    // A RabbitMQ-féle feliratkozás a hover eseményekre (csak egyszer per roomId):
    subscribeToRoomEvent(roomId, "hoverOnCard", (data) => {
      // Minden bejövő hoverOnCard event a RabbitMQ-től
      io.to(roomId).emit("hoverOnCardUpdate", data);
    });
    subscribeToRoomEvent(roomId, "hoverOffCard", (data) => {
      // Minden bejövő hoverOffCard event
      io.to(roomId).emit("hoverOffCardUpdate", data);
    });


    subscribeToRoomEvent(roomId, "cardToReveal", (data) => {
      // data: { cardContainerID, playerName, ... }
      io.to(roomId).emit("cardToRevealUpdate", data);
    });
  
    subscribeToRoomEvent(roomId, "cardToHide", (data) => {
      io.to(roomId).emit("cardToHideUpdate", data);
    });

    subscribeToRoomEvent(roomId, "nextTurn", (data) => {
      // data = { roomId, nextPlayer }
      console.log("📥 nextTurn event jött:", data);
      io.to(roomId).emit("nextTurnUpdate", data);
    });

    subscribeToRoomEvent(roomId, "drawCard", (data) => {
      io.to(roomId).emit("drawCardUpdate", data);
    });
    

  });

  // ============= CHAT (send_message) =============
  socket.on("send_message", ({ roomId, playerName, message }) => {
    console.log(`💬 Üzenet érkezett: ${playerName} -> ${roomId}: ${message}`);
    io.to(roomId).emit("receiveMessage", { playerName, message });
  });

  // ============= VoiceChat: WebRTC Offer/Answer =============
  socket.on("join_voice_chat", ({ roomId, playerName }) => {
    socket.join(roomId);
    console.log(`🎤 ${playerName} csatlakozott a voice chathez: ${roomId}`);
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

  // ============= PLAYER_READY =============
  socket.on("player_ready", ({ roomId, playerName }) => {
    if (!rooms[roomId]) return;

    if (!rooms[roomId].readyPlayers) {
      rooms[roomId].readyPlayers = [];
    }

    if (!rooms[roomId].readyPlayers.includes(playerName)) {
      rooms[roomId].readyPlayers.push(playerName);
    }

    console.log(`${playerName} is ready in room ${roomId}`);

    io.to(roomId).emit("playerReady", {
      playerName,
      readyPlayers: rooms[roomId].readyPlayers,
    });

    // Ha mindenki ready -> új gameRoom
    if (rooms[roomId].readyPlayers.length === rooms[roomId].players.length) {
      const gameRoomId = `game_${roomId}`;

      const deck = shuffleDeck(createDeck());

      rooms[gameRoomId] = {
        players: [...rooms[roomId].players],
        deck: deck,
        hands: {},
        turnIndex: 0,
        discardPile: [],
      };
      console.log(`🎲 Új játék szoba létrehozva: ${gameRoomId}`);

      startGame(roomId);
      // pl: io.to(roomId).emit("startGame", { gameRoomId });
    }
  });

  // ============= GAME START =============
  function startGame(roomId) {
    if (!rooms[roomId]) return;

    const gameRoomId = `game_${roomId}`;
    rooms[gameRoomId] = {
      players: [...rooms[roomId].players],
      deck: shuffleDeck(),
      hands: {},
      turnIndex: 0,
      discardPile: [],
    };

    rooms[gameRoomId].players.forEach((player) => {
      rooms[gameRoomId].hands[player] = rooms[gameRoomId].deck.splice(0, 4);
    });

    rooms[gameRoomId].turnIndex = Math.floor(Math.random() * rooms[gameRoomId].players.length);

    io.to(roomId).emit("gameStarted", {
      gameRoomId,
      players: rooms[gameRoomId].players,
      hands: rooms[gameRoomId].hands,
      turnIndex: rooms[gameRoomId].turnIndex,
      deckSize: rooms[gameRoomId].deck.length,
      discardPile: rooms[gameRoomId].discardPile,
    });

    console.log(`🎲 Játék indult: ${gameRoomId}`);
  }

  function shuffleDeck() {
    const deck = [
      "2H","3H","4H","5H","6H","7H","8H","9H","10H","JH","QH","KH","AH",
      "2D","3D","4D","5D","6D","7D","8D","9D","10D","JD","QD","KD","AD",
      "2C","3C","4C","5C","6C","7C","8C","9C","10C","JC","QC","KC","AC",
      "2S","3S","4S","5S","6S","7S","8S","9S","10S","JS","QS","KS","AS"
    ];
    return deck.sort(() => Math.random() - 0.5);
  }

  // ============= DRAW CARD =============
  socket.on("drawCard", ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room || room.deck.length === 0) return;

    const drawnCard = room.deck.pop();
    room.hands[playerName].push(drawnCard);

    console.log(`🎴 ${playerName} húzott egy lapot: ${drawnCard}`);
    io.to(roomId).emit("updateGameState", room);
  });

  // ============= DISCARD CARD =============
  socket.on("discardCard", ({ roomId, playerName, card }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.hands[playerName] = room.hands[playerName].filter((c) => c !== card);
    room.discardPile.push(card);

    console.log(`🃏 ${playerName} eldobott egy lapot: ${card}`);
    io.to(roomId).emit("updateGameState", room);
  });

  // ============= END TURN =============
  socket.on("endTurn", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    console.log(`🔄 Következő játékos: ${room.players[room.turnIndex]}`);
    io.to(roomId).emit("updateGameState", room);
  });

  // ============= DISCONNECT HANDLER =============
  socket.on("disconnect", () => {
    console.log(`⚠️ Lecsatlakozott: ${socket.id}`);
    const userData = socketToUser[socket.id];
    if (userData) {
      const { roomId, playerName } = userData;
      if (rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter((p) => p !== playerName);
        io.to(roomId).emit("userLeft", {
          roomId,
          players: rooms[roomId].players,
        });
      }
      delete socketToUser[socket.id];
    }
  });

  // ============= HOVER ON CARD =============
  socket.on("hoverOnCard", ({ roomId, cardContainerID, color, playerName }) => {
    console.log(`🟡 hoverOnCard: ${playerName} -> ${cardContainerID}, color=${color}`);
    publishHoverOnCard(roomId, cardContainerID, color, playerName);
  });

  // ============= HOVER OFF CARD =============
  socket.on("hoverOffCard", ({ roomId, cardContainerID, playerName }) => {
    console.log(`🔵 hoverOffCard: ${playerName} -> ${cardContainerID}`);
    publishHoverOffCard(roomId, cardContainerID, playerName);
  });


  socket.on("card_to_reveal", ({ roomId, cardContainerID }) => {
    const userData = socketToUser[socket.id]; 
    if (!userData) return;
    const { playerName } = userData;
  
    console.log(`🔶 card_to_reveal event: ${playerName} -> ${cardContainerID}`);
    // publish => 'cardToReveal'
    publishCardToReveal(roomId, cardContainerID, playerName);
  });
  
  socket.on("card_to_hide", ({ roomId, cardContainerID }) => {
    const userData = socketToUser[socket.id];
    if (!userData) return;
    const { playerName } = userData;
  
    console.log(`🔷 card_to_hide event: ${playerName} -> ${cardContainerID}`);
    publishCardToHide(roomId, cardContainerID, playerName);
  });

  socket.on("nextTurn", ({ roomId, nextPlayer }) => {
    console.log(`🔄 Körváltás kérése a szobában: ${roomId}, következő játékos: ${nextPlayer}`);
    publishNextTurn(roomId, nextPlayer);
  });

  socket.on("drawCard", ({ roomId, nthCardInDeck, playerName }) => {
    const room = rooms[roomId];
    if (!room || room.deck.length === 0) return;
  
    const drawnCard = room.deck[nthCardInDeck];
    console.log(`🎴 ${playerName} húzott egy lapot: ${drawnCard}`);
  
    // Küldjük vissza a kártyát a hívó játékosnak
    socket.emit("cardDrawn", {
      card: drawnCard,
      nthCardInDeck,
    });
  
    // Frissítjük a pakliban lévő lapok számát
    room.nthCardInDeck = nthCardInDeck - 1;
  
    // Továbbítjuk a többi játékosnak a húzott kártya állapotát
    io.to(roomId).emit("updateGameState", room);
  });
  
  socket.on("drawCard", ({ roomId, nthCardInDeck, playerName }) => {
    const room = rooms[roomId];
    if (!room || room.deck.length === 0) return;
  
    const drawnCard = room.deck[nthCardInDeck];
    console.log(`🎴 ${playerName} húzott egy lapot: ${drawnCard}`);
  
    // Küldjük vissza a kártyát a hívó játékosnak
    socket.emit("cardDrawn", {
      card: drawnCard,
      nthCardInDeck,
    });
  
    // Frissítjük a pakliban lévő lapok számát
    room.nthCardInDeck = nthCardInDeck - 1;
  
    // Továbbítjuk a többi játékosnak a húzott kártya állapotát
    publishDrawCard(roomId, nthCardInDeck, playerName);
  });

});

// Elindítjuk a HTTP szervert
server.listen(PORT, () => {
  console.log(`✅ HTTP szerver fut a ${PORT} porton`);
});

// Elindítjuk a Socket.IO szervert
io.listen(WS_PORT, () => {
  console.log(`✅ WebSocket szerver fut a ${WS_PORT}-es porton`);
});
