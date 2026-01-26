// backend/routes/users.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../firebase');
const rooms = require('../roomsData.js');

// Ezzel a függvénnyel generálunk 6 jegyű szobakódot
function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// =========== REGISZTRÁCIÓ ===========
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Felhasználónév és jelszó szükséges' });
    }

    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once('value');
    if (snapshot.exists()) {
      return res.status(409).json({ error: 'Felhasználó már létezik' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userID = uuidv4();

    await userRef.set({
      id: userID,
      username,
      hashedPassword,
      token: null 
    });

    return res.status(201).json({ message: 'Sikeres regisztráció' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Szerver hiba' });
  }
});

// =========== BEJELENTKEZÉS ===========
// Itt automatikusan létrehozunk egy új room-ot.
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Felhasználónév és jelszó szükséges' });
    }

    const userRef = db.ref(`users/${username}`);
    const snapshot = await userRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Nincs ilyen felhasználó' });
    }

    const userData = snapshot.val();
    const match = await bcrypt.compare(password, userData.hashedPassword);
    if (!match) {
      return res.status(401).json({ error: 'Hibás jelszó' });
    }

    // Token generálás
    const sessionToken = uuidv4();
    await userRef.update({ token: sessionToken });

    // Itt jön a "minden login után új room"
    const roomId = generateRoomCode();
    rooms[roomId] = { 
      players: [username], 
      status: "waiting" 
    };

    console.log(`✅ [LOGIN] ${username} belépett, új roomId: ${roomId}`);

    // Visszaküldjük a frontendre
    return res.status(200).json({ 
      message: 'Sikeres bejelentkezés',
      sessionToken,
      username: userData.username,
      id: userData.id,
      roomId  // -> Ezt a frontend sessionStorage-be menti
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Szerver hiba' });
  }
});

module.exports = router;
