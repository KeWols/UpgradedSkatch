// backend/routes/history.js
const express = require("express");
const router = express.Router();
const db = require("../firebase");

// GET /api/history/:username - Lekéri egy játékos előző meccseit
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const historyRef = db.ref("matchHistory");
    
    // Firebase lekérdezés (egyszerűsítve: kliens oldalon szűrünk vagy itt)
    const snapshot = await historyRef.orderByChild("winner").equalTo(username).once("value");
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const matches = [];
    snapshot.forEach((child) => {
      matches.push(child.val());
    });

    return res.json(matches);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/history - Ezt hívod meg a szerverről (belső hívás) vagy kliensről a meccs végén
router.post("/", async (req, res) => {
    // Ezt akár az index.js endGame függvényében is hívhatod közvetlenül DB mentéssel, 
    // de REST végpontként így nézne ki:
    const { roomId, winner, players, timestamp } = req.body;
    const newRef = db.ref("matchHistory").push();
    await newRef.set({ roomId, winner, players, timestamp });
    res.status(201).json({ message: "History saved" });
});

module.exports = router;