// backend/routes/users.js – RESTful user resource

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../firebase");

// POST /api/users – create user (register)
router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Felhasználónév és jelszó szükséges" });
    }

    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once("value");
    if (snapshot.exists()) {
      return res.status(409).json({ error: "Felhasználó már létezik" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userID = uuidv4();

    await userRef.set({
      id: userID,
      username,
      hashedPassword,
      token: null,
    });

    return res.status(201).json({ message: "Sikeres regisztráció" });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Szerver hiba" });
  }
});

module.exports = router;
