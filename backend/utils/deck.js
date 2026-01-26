const suits = ["clubs", "diamonds", "hearts", "spades"]; // A kártyák négy típusa
const cardNames = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k", "a"]; // A kártyák nevei

// Kártyákhoz tartozó értékek
const cardValues = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "j": 11, "q": 12, "k": 13, "a": 1
};

// Pakli létrehozása az összes kártyával
function createDeck() {
  let deck = [];
  for (let suit of suits) {
    for (let name of cardNames) {
      deck.push({ name, value: cardValues[name], suit });
    }
  }
  return deck;
}

// Pakli keverése - Fisher-Yates algoritmus
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; // Két kártya helyet cserél
  }
  return deck;
}

function getCardImage(card) {
  if (!card) return null;
  return `../assets/${card.name}_of_${card.suit}.png`;
}

module.exports = { createDeck, shuffleDeck, getCardImage };
//module.exports = { createDeck, shuffleDeck };