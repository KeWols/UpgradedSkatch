// backend/routes/rooms.js

const express = require('express');
const router = express.Router();
const rooms = require('../roomsData.js');

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Szoba létrehozása KÜLÖN - ha valaki explicit "Create Room" gombra kattint
router.post("/create-room", (req, res) => {
  const roomId = generateRoomCode();
  rooms[roomId] = { players: [], status: "waiting" };
  console.log(`✅ Új szoba létrehozva: ${roomId}`);
  return res.json({ roomId });
});

// Szobához csatlakozás
router.post("/join-room", (req, res) => {
  const { roomId, playerName } = req.body;
  
  if (!roomId || !playerName) {
    return res.status(400).json({ error: "Hibás adatok" });
  }
  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Szoba nem létezik" });
  }
  if (!rooms[roomId].players.includes(playerName)) {
    rooms[roomId].players.push(playerName);
  }
  console.log(`${playerName} csatlakozott a(z) ${roomId} szobához`);

  // Itt adjunk vissza a players tömböt is
  return res.json({
    message: "Csatlakozás sikeres",
    roomId,
    players: rooms[roomId].players  // <<--- EZ A LÉNYEG
  });
});

module.exports = router;
