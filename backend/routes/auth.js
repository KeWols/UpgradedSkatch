const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../firebase");
const { v4: uuidv4 } = require("uuid");

// ===== REGISZTRÁCIÓ =====
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    // Ellenőrizzük, hogy van-e már ilyen kulcs
    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once("value");
    if (snapshot.exists()) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Jelszó hash-elés
    const hashedPassword = await bcrypt.hash(password, 10);

    // Egyedi user ID generálása
    const userID = uuidv4();

    // DB-be mentjük a felhasználót
    await userRef.set({
      id: userID,
      username,
      hashedPassword
    });

    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    // Lekérjük az adatbázisból a felhasználót
    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const userData = snapshot.val(); // { id, username, hashedPassword }

    // Jelszo
    const match = await bcrypt.compare(password, userData.hashedPassword);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Ideiglenes session token
    const sessionToken = uuidv4();

    // szobakod generalasa
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();

    // Visszaadjuk a username-et is a frontendnek
    return res.status(200).json({
      message: "Login successful",
      sessionToken,
      roomId,
      id: userData.id,
      username: userData.username
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});



module.exports = router;
