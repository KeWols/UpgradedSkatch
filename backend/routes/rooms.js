// backend/routes/rooms.js

const express = require("express");
const router = express.Router();
const rooms = require("../roomsData.js");

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// uj szoba letrehozasa
router.post("/", (req, res) => {
  const roomId = generateRoomCode();
  rooms[roomId] = { players: [], status: "waiting" };
  console.log(`Uj szoba letrehozva: ${roomId}`);
  return res.status(201).json({ roomId });
});

// szoba allapot lekerese
router.get("/:roomId", (req, res) => {
  const { roomId } = req.params;
  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Szoba nem létezik" });
  }
  return res.json({
    roomId,
    players: rooms[roomId].players,
    status: rooms[roomId].status,
  });
});

// jatekos roomba csatlakozas
router.post("/:roomId/players", (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;

  if (!playerName) {
    return res.status(400).json({ error: "playerName is required" });
  }
  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Szoba nem létezik" });
  }
  if (!rooms[roomId].players.includes(playerName)) {
    rooms[roomId].players.push(playerName);
  }
  console.log(`${playerName} csatlakozott a(z) ${roomId} szobához`);

  return res.status(200).json({
    message: "Csatlakozás sikeres",
    roomId,
    players: rooms[roomId].players,
  });
});

// szoba torlese
router.delete("/:roomId", (req, res) => {
  const { roomId } = req.params;

  if (rooms[roomId]) {
    delete rooms[roomId];
    console.log(`Szoba torolve: ${roomId}`);
    return res.status(200).json({ message: "Szoba sikeresen törölve" });
  } else {
    return res.status(404).json({ error: "A szoba nem található" });
  }
});

module.exports = router;
