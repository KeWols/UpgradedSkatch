const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Firebase inicializálása Admin SDK-val
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://finelprojectrtweb-default-rtdb.europe-west1.firebasedatabase.app/",
});

const db = admin.database(); // Realtime Database kapcsolat

module.exports = db;