import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getSocket,
  sendHoverOnCard,
  sendHoverOffCard,
  sendCardToReveal,
  sendHideRevealedCard,
  sendNextTurn,
  sendDrawCard,
  sendDiscardDrawnCard,
  sendSwapDrawnWithHand,
  sendSkatch
} from "../utils/websocket";

import cardBack from "../assets/card-back.png";
import aOfSpades from "../assets/a_of_spades.png";
import opponentRevealed from "../assets/opponentRevealed.png";
import deck from "../assets/deck.png";
import discardZone from "../assets/discard_zone.png";
import { getCardImage } from "../utils/deck";

import "./SkatchCardGame.css";

const colorList = ["#1E90FF", "#FFA500", "#A349A4", "#32CD32"];

function SkatchCardGame() {
  const location = useLocation();
  const { state } = location;
  const { roomId, players = [], dealerIndex, turnIndex, cardsPerPlayer, currentTurn: initialTurn } = state || {};

  const cardsPerPlayerCount = cardsPerPlayer ?? 6;

  const [playersInRoom, setPlayersInRoom] = useState([]);
  const [playerColors, setPlayerColors] = useState({});
  const [cardStyles, setCardStyles] = useState({});
  const [cardImages, setCardImages] = useState({});
  const [playerName, setPlayerName] = useState("");
  const [currentTurn, setCurrentTurn] = useState("");
  const [deckImage, setDeckImage] = useState(deck);
  const [discardZoneImage, setDiscardZoneImage] = useState(discardZone);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [nthCardInDeck, setNthCardInDeck] = useState(52 - (players.length * cardsPerPlayerCount));

  const [deckSize, setDeckSize] = useState(state?.deckSize ?? null);
  const [drawnCardImage, setDrawnCardImage] = useState(null);

  const [completedRounds, setCompletedRounds] = useState(state?.completedRounds ?? 0);
  const [finalRoundActive, setFinalRoundActive] = useState(state?.finalRoundActive ?? false);
  const [skatchCaller, setSkatchCaller] = useState(state?.skatchCaller ?? null);
  const [gameResult, setGameResult] = useState(null);


  useEffect(() => {
    if (!roomId || players.length === 0) {
      return;
    }

    const storedPlayerName = sessionStorage.getItem("username") || "";
    setPlayerName(storedPlayerName);

    setPlayersInRoom(players);

    const assignedColors = players.reduce((acc, pl, i) => {
      acc[pl] = colorList[i % colorList.length];
      return acc;
    }, {});
    setPlayerColors(assignedColors);

    // if (!currentTurn && players.length > 0) {
    //   setCurrentTurn(players[0]);
    // }

    if (!currentTurn && initialTurn) {
      setCurrentTurn(initialTurn);
    }

    const index = players.indexOf(storedPlayerName);
    setPlayerIndex(index);

    const s = getSocket();
    if (s) {
      s.on("hoverOnCardUpdate", (data) => {
        const { cardContainerID, color } = data;
        setCardStyles((prev) => ({
          ...prev,
          [cardContainerID]: { backgroundColor: color },
        }));
      });

      s.on("hoverOffCardUpdate", (data) => {
        const { cardContainerID } = data;
        setCardStyles((prev) => ({
          ...prev,
          [cardContainerID]: { backgroundColor: "transparent" },
        }));
      });

      s.on("cardToRevealUpdate", (data) => {
        const { cardContainerID, playerName: revealer } = data;
        if (revealer !== playerName) {
          setCardImages((prev) => ({
            ...prev,
            [cardContainerID]: opponentRevealed
          }));
        }
      });

      s.on("cardToHideUpdate", (data) => {
        const { cardContainerID } = data;
        setCardImages((prev) => ({
          ...prev,
          [cardContainerID]: cardBack
        }));
      });

      s.on("nextTurnUpdate", (data) => {
        if (data?.roomId !== roomId) {
          return;
        }

        if (data.nextPlayer) {
          setCurrentTurn(data.nextPlayer);
        }
        if (typeof data.completedRounds === "number") {
          setCompletedRounds(data.completedRounds);
        }
        if (typeof data.finalRoundActive === "boolean") {
          setFinalRoundActive(data.finalRoundActive);
        }
        if (data.skatchCaller !== undefined) {
          setSkatchCaller(data.skatchCaller);
        }
      });

      s.on("finalRoundStarted", (data) => {
        if (data?.roomId !== roomId) {
          return;
        }
        setFinalRoundActive(true);
        setSkatchCaller(data.skatchCaller || null);
      });

      s.on("gameEnded", (data) => {
        if (data?.roomId !== roomId) {
          return;
        }

        setGameResult(data);

        const hands = data.hands || {};
        const updates = {};
        for (const [p, cards] of Object.entries(hands)) {
          if (!Array.isArray(cards)) {
            continue;
          }
          for (let i = 0; i < cards.length; i++) {
            const img = getCardImage(cards[i]);
            if (img) {
              updates[`${p}-${i}`] = img;
            }
          }
        }
        setCardImages((prev) => ({ ...prev, ...updates }));
      });

      s.on("cardDrawn", (data) => {
        const { card } = data;
        const cardImage = getCardImage(card);
        setDrawnCardImage(cardImage);
        sendCardToReveal(roomId, "drawn_card");
      });

      s.on("deckSizeUpdate", (data) => {
        setDeckSize(data.deckSize);
      });

      s.on("revealCard", (data) => {
        const { cardContainerID, card } = data || {};
        const img = getCardImage(card);
        if (!img) {
          return;
        }
        setCardImages((prev) => ({ ...prev, [cardContainerID]: img }));
      });

      s.on("discardTopUpdate", (data) => {
        const img = getCardImage(data?.card);
        if (img) {
          setDiscardZoneImage(img);
        }
      });

      s.on("clearDrawnCard", () => {
        setDrawnCardImage(null);
        setCardImages((prev) => ({ ...prev, drawn_card: cardBack }));
      });

      s.on("handCardReset", (data) => {
        const id = data?.cardContainerID;
        if (!id) {
          return;
        }
        setCardImages((prev) => ({ ...prev, [id]: cardBack }));
      });

    }

    return () => {
      if (s) {
        s.off("hoverOnCardUpdate");
        s.off("hoverOffCardUpdate");
        s.off("cardToRevealUpdate");
        s.off("cardToHideUpdate");
        s.off("nextTurnUpdate");
        s.off("cardDrawn");
        s.off("revealCard");
        s.off("discardTopUpdate");
        s.off("clearDrawnCard");
        s.off("handCardReset");
        s.off("finalRoundStarted");
        s.off("gameEnded");
      }
    };
    
  }, [roomId, players, playerName, currentTurn]);

  const handleMouseEnter = (cardContainerID) => {
    if (!roomId || !playerName) {
      return;
    }
    const color = playerColors[playerName] || "white";
    sendHoverOnCard(roomId, cardContainerID, color, playerName);
  };

  const handleMouseLeave = (cardContainerID) => {
    if (!roomId || !playerName) {
      return;
    }
    sendHoverOffCard(roomId, cardContainerID, playerName);
  };

  // const handleReveal = async (cardContainerID) => {
  //   if (!roomId || !playerName) { return; }
  //   console.log(`Kattintott kartya: ${cardContainerID} (player: ${playerName})`);

  //   setCardImages((prev) => ({
  //     ...prev,
  //     [cardContainerID]: aOfSpades
  //   }));

  //   sendCardToReveal(roomId, cardContainerID);

  //   await new Promise((res) => setTimeout(res, 2500));

  //   sendHideRevealedCard(roomId, cardContainerID);

  //   setCardImages((prev) => ({
  //     ...prev,
  //     [cardContainerID]: cardBack
  //   }));
  // };

  const handleReveal = async (cardContainerID) => {
    if (!roomId || !playerName) {
      return;
    }

    sendCardToReveal(roomId, cardContainerID);

    await new Promise((res) => setTimeout(res, 2500));

    sendHideRevealedCard(roomId, cardContainerID);

    setCardImages((prev) => ({
      ...prev,
      [cardContainerID]: cardBack
    }));
  };

  const parseCardId = (id) => {
    const dash = id.lastIndexOf("-");
    if (dash <= 0) {
      return null;
    }
    const owner = id.slice(0, dash);
    const idx = Number(id.slice(dash + 1));
    if (!Number.isInteger(idx)) {
      return null;
    }
    return { owner, idx };
  };

  const handleCardClick = (cardContainerID) => {
    const info = parseCardId(cardContainerID);
    if (!info) {
      return;
    }

    if (drawnCardImage && info.owner === playerName && currentTurn === playerName) {
      sendSwapDrawnWithHand(roomId, info.idx);
      return;
    }

    handleReveal(cardContainerID);
  };

  const handleDiscardClick = () => {
    if (!drawnCardImage) {
      return;
    }
    if (currentTurn !== playerName) {
      return;
    }
    sendDiscardDrawnCard(roomId);
  };


  const getCardImageSrc = (cardContainerID) => {
    return cardImages[cardContainerID] || cardBack;
  };

  const handleDrawCard = () => {
    if (!roomId || !playerName) {
      return;
    }
    if (currentTurn && currentTurn !== playerName) {
      return;
    }
    if (drawnCardImage) {
      return;
    }

    sendDrawCard(roomId, playerName);
  };


  const handleNextTurn = () => {
    if (!roomId || playersInRoom.length < 1) {
      return;
    }

    const idx = playersInRoom.indexOf(currentTurn);
    const nextIndex = (idx + 1) % playersInRoom.length;
    const nextP = playersInRoom[nextIndex];

    console.log("Next turn ->", nextP);
    sendNextTurn(roomId, nextP);
  };

  const renderCards = (count, position, rotate = false) => {
    return Array.from({ length: count }).map((_, index) => {
      let cardContainerID;
      switch (position) {
        case "bottom":
          cardContainerID = `${playersInRoom[playerIndex]}-${index}`;
          break;
        case "top":
          cardContainerID = `${playersInRoom[(playerIndex + 1) % numPlayers]}-${index}`;
          break;
        case "right":
          cardContainerID = `${playersInRoom[(playerIndex + 2) % numPlayers]}-${index}`;
          break;
        case "left":
          cardContainerID = `${playersInRoom[(playerIndex + 3) % numPlayers]}-${index}`;
          break;
        default:
          cardContainerID = `unknown-${index}`;
      }

      const styleObj = cardStyles[cardContainerID] || {};

      return (
        <div
          key={cardContainerID}
          id={cardContainerID}
          className={`cardContainer ${rotate ? "rotated" : ""}`}
          onClick={() => handleCardClick(cardContainerID)}
          onMouseEnter={() => handleMouseEnter(cardContainerID)}
          onMouseLeave={() => handleMouseLeave(cardContainerID)}
          style={styleObj}
        >
          <img
            src={getCardImageSrc(cardContainerID)}
            alt="card"
            className="cardImage"
          />
        </div>
      );
    });
  };

  const renderCenterCards = () => {
    return (
      <div className="centerCards">
        <div
          id="deck"
          className="cardContainer"
          onClick={handleDrawCard}
          onMouseEnter={() => handleMouseEnter("deck")}
          onMouseLeave={() => handleMouseLeave("deck")}
          style={cardStyles["deck"] || {}}
        >
          <img src={deckImage} alt="deck" className="cardImage" />
        </div>
        <div
          id="discardZone"
          className="cardContainer"
          onMouseEnter={() => handleMouseEnter("discardZone")}
          onMouseLeave={() => handleMouseLeave("discardZone")}
          style={cardStyles["discardZone"] || {}}
          onClick={handleDiscardClick}
        >
          <img src={discardZoneImage} alt="discard zone" className="cardImage" />
        </div>
        <div
          id="drawn_card"
          className="cardContainer"
          style={{ display: drawnCardImage ? "block" : "none" }}
        >
          <img src={drawnCardImage || cardBack} alt="drawn card" className="cardImage" />
        </div>
      </div>
    );
  };

  const numPlayers = playersInRoom.length;
  const canSkatch = playerName === currentTurn && completedRounds >= 2 && !finalRoundActive && !drawnCardImage;


  return (
    <div className="outerWrapper">
      <div className="playerTable">
        <table>
          <thead>
            <tr>
              <th>Players</th>
            </tr>
          </thead>
          <tbody>
            {playersInRoom.map((player) => (
              <tr
                key={player}
                style={{
                  backgroundColor: player === currentTurn ? "#FFD700" : "transparent"
                }}
              >
                <td>{player}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="board">
        <h2>SkatchCardGame: {roomId}</h2>
        <p>Players: {playersInRoom.join(", ")}</p>
        <p>Deck size: {deckSize ?? "unknown"}</p>

        <p>Completed rounds: {completedRounds}</p>
        {finalRoundActive && <p>Utolso kor</p>}
        {skatchCaller && <p>Skatch caller: {skatchCaller}</p>}


        {/*<div className="row bottomRow">{renderCards(6, "bottom")}</div>*/}
        <div className="row bottomRow">{renderCards(cardsPerPlayerCount, "bottom")}</div>

        {numPlayers >= 2 && <div className="row topRow">{renderCards(cardsPerPlayerCount, "top")}</div>}
        {numPlayers >= 3 && <div className="column rightColumn">{renderCards(cardsPerPlayerCount, "right", true)}</div>}
        {numPlayers >= 4 && <div className="column leftColumn">{renderCards(cardsPerPlayerCount, "left", true)}</div>}


        {renderCenterCards()}
      </div>

      {gameResult && (
        <div style={{ marginTop: 20 }}>
          <h3>Game Over</h3>
          <p>Winner: {gameResult.winner}</p>
          <ul>
            {Object.entries(gameResult.scores || {}).map(([p, sc]) => (
              <li key={p}>{p}: {sc}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="nextRoundContainer">
        <button
          onClick={() => sendSkatch(roomId)}
          disabled={!canSkatch}
          className="nextRoundButton"
        >
          Skatch!
        </button>
      </div>
    </div>
  );
}

export default SkatchCardGame;