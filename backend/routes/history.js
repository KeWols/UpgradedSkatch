// backend/routes/history.js
const express = require("express");
const router = express.Router();
const db = require("../firebase");

// jatekos meccsei winner alapjan
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const historyRef = db.ref("matchHistory");

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

// meccs mentese
router.post("/", async (req, res) => {
    const { roomId, winner, players, timestamp } = req.body;
    const newRef = db.ref("matchHistory").push();
    await newRef.set({ roomId, winner, players, timestamp });
    res.status(201).json({ message: "History saved" });
});

module.exports = router;