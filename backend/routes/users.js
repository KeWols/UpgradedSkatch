// backend/routes/users.js – RESTful user resource

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../firebase");

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

router.patch("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "Új jelszó megadása kötelező" });
    }

    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Felhasználó nem található" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRef.update({ hashedPassword });

    return res.status(200).json({ message: "Jelszó sikeresen módosítva" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Felhasználó nem található" });
    }

    await userRef.remove();

    return res.status(200).json({ message: "Fiók sikeresen törölve" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
