// backend/routes/sessions.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../firebase");
const rooms = require("../roomsData.js");

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/sessions – create session (login)
router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Felhasználónév és jelszó szükséges" });
    }

    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Nincs ilyen felhasználó" });
    }

    const userData = snapshot.val();
    const match = await bcrypt.compare(password, userData.hashedPassword);
    if (!match) {
      return res.status(401).json({ error: "Hibás jelszó" });
    }

    const sessionToken = uuidv4();
    await userRef.update({ token: sessionToken });

    const roomId = generateRoomCode();
    rooms[roomId] = {
      players: [username],
      status: "waiting",
    };

    console.log(`[LOGIN] ${username} belepet, uj roomId: ${roomId}`);

    return res.status(200).json({
      message: "Sikeres bejelentkezés",
      sessionToken,
      username: userData.username,
      id: userData.id,
      roomId,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Szerver hiba" });
  }
});

module.exports = router;