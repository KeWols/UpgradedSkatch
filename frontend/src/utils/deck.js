const images = require.context("../assets", false, /\.png$/);

const suitMap = {
  S: "spades",
  H: "hearts",
  D: "diamonds",
  C: "clubs",
};

const rankMap = {
  A: "a",
  K: "k",
  Q: "q",
  J: "j",
};

export function getCardImage(cardCode) {
  if (!cardCode || typeof cardCode !== "string") return null;

  const suitLetter = cardCode.slice(-1);
  const rankRaw = cardCode.slice(0, -1);

  const suit = suitMap[suitLetter];
  if (!suit) return null;

  const rank = rankMap[rankRaw] || rankRaw.toLowerCase();
  const filename = `./${rank}_of_${suit}.png`;

  try {
    return images(filename);
  } catch {
    return null;
  }
}
