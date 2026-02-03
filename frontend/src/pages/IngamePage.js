import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWebSocket, disconnectWebSocket } from "../utils/websocket";
import { joinRoom } from "../utils/api";
import { deleteUser } from "../utils/api";
import Chat from "../components/Chat";
import VoiceChat from "../components/VoiceChat";

const IngamePage = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState(sessionStorage.getItem("roomId") || "");
  const [playerName] = useState(sessionStorage.getItem("username") || "");

  const [players, setPlayers] = useState([]);
  const [readyPlayers, setReadyPlayers] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [socket, setSocket] = useState(null);

  const [joinRoomIdInput, setJoinRoomIdInput] = useState("");
  const [isReady, setIsReady] = useState(false);

  const [matchHistory, setMatchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!playerName) {
      alert("Not logged in. Redirecting to login.");
      navigate("/login");
    }
  }, [playerName, navigate]);

  useEffect(() => {
    if (!roomId || !playerName) return;
    const s = connectWebSocket(roomId, playerName);
    setSocket(s);
  }, [roomId, playerName]);

  useEffect(() => {
    if (!socket || !roomId || !playerName) return;

    const handleUserJoined = (data) => {
      if (data?.roomId === roomId && Array.isArray(data.players)) {
        setPlayers([...data.players]);
      }
    };

    const handleUserLeft = (data) => {
      if (data?.roomId === roomId && Array.isArray(data.players)) {
        setPlayers([...data.players]);
      }
    };

    const handleReceiveMessage = (msg) => {
      setChatLog((prev) => [...prev, msg]);
    };

    const handlePlayerReady = (data) => {
      if (Array.isArray(data?.readyPlayers)) {
        setReadyPlayers([...data.readyPlayers]);
      }
    };

    const handleGameStarted = (payload) => {
      const {
        gameRoomId,
        players: serverPlayers,
        deckSize,
        dealerIndex,
        turnIndex,
        cardsPerPlayer,
        currentTurn,
      } = payload || {};

      if (!gameRoomId) return;

      socket.emit("join_room", { roomId: gameRoomId, playerName });

      navigate("/skatch-game", {
        state: {
          roomId: gameRoomId,
          players: Array.isArray(serverPlayers) ? serverPlayers : [],
          deckSize,
          dealerIndex,
          turnIndex,
          cardsPerPlayer,
          currentTurn,
        },
      });
    };

    socket.on("userJoined", handleUserJoined);
    socket.on("userLeft", handleUserLeft);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("playerReady", handlePlayerReady);
    socket.on("gameStarted", handleGameStarted);

    if (socket.connected) {
      socket.emit("join_room", { roomId, playerName });
    } else {
      socket.once("connect", () => {
        socket.emit("join_room", { roomId, playerName });
      });
    }

    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("userLeft", handleUserLeft);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("playerReady", handlePlayerReady);
      socket.off("gameStarted", handleGameStarted);
    };
  }, [socket, roomId, playerName, navigate]);

  const handleJoinAnotherRoom = async () => {
    const target = joinRoomIdInput.trim();
    if (!target) return;

    const response = await joinRoom(target, playerName);
    if (response?.error) {
      alert(response.error);
      return;
    }

    disconnectWebSocket();
    setSocket(null);

    setIsReady(false);
    setReadyPlayers([]);
    setChatLog([]);

    if (Array.isArray(response.players)) setPlayers([...response.players]);
    else setPlayers([]);

    setRoomId(response.roomId);
    sessionStorage.setItem("roomId", response.roomId);

    setJoinRoomIdInput("");
  };

  const handleLogout = () => {
    sessionStorage.clear();
    disconnectWebSocket();
    setSocket(null);
    navigate("/");
  };

  const sendMessage = (message) => {
    if (!socket || !socket.connected) return;
    socket.emit("send_message", { roomId, playerName, message });
  };

  const handleReady = () => {
    if (!socket || !socket.connected) return;
    socket.emit("player_ready", { roomId, playerName });
    setIsReady(true);
  };

  const handleShowHistory = async () => {
    
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    try {

      const response = await fetch(`/api/history/${playerName}`);
      
      if (response.ok) {
        const data = await response.json();

        const historyArray = Array.isArray(data) ? data : Object.values(data);
        
        historyArray.sort((a, b) => b.timestamp - a.timestamp);
        
        setMatchHistory(historyArray);
        setShowHistory(true);
      } else {
        console.error("Hiba a történet lekérésekor");
      }
    } catch (error) {
      console.error("Szerver hiba:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Biztosan törölni szeretnéd a fiókodat?")) return;

    try {
      const response = await deleteUser(playerName);
      if (response.message) {
        alert(response.message);
        handleLogout();
      } else {
        alert("Hiba a fiók törlésekor: " + (response.error || "Ismeretlen hiba"));
      }
    } catch (error) {
      console.error("Fiók törlési hiba:", error);
      alert("Fiók törlési hiba");
    }
  };

  const playerCount = players.length;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Ingame Page</h2>
      <p>
        <strong>Room:</strong> {roomId}
      </p>
      <p>
        <strong>Player:</strong> {playerName}
      </p>
      <p>
        <strong>Players in this room:</strong> {players.join(", ")}
      </p>

      <button onClick={handleReady} disabled={isReady}>
        {isReady ? "Ready" : "Ready"}
      </button>

      <p>Ready Players: {readyPlayers.join(", ")}</p>

      <div style={{ marginTop: "10px" }}>
        <input
          type="text"
          placeholder="Enter other room ID"
          value={joinRoomIdInput}
          onChange={(e) => setJoinRoomIdInput(e.target.value)}
        />
        <button onClick={handleJoinAnotherRoom}>Join Another Room</button>
      </div>

      {!isReady && (
        <button onClick={handleLogout} style={{ marginTop: "10px" }}>
          Logout
        </button>
      )}

      <Chat chatLog={chatLog} onSendMessage={sendMessage} />

      {playerCount === 2 && socket?.connected && (
        <VoiceChat
          socket={socket}
          roomId={roomId}
          playerName={playerName}
          playerCount={playerCount}
        />
      )}

      {/* 3. ÚJ GOMB ÉS LISTA MEGJELENÍTÉSE */}
      <div style={{ margin: "20px 0", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
        <button onClick={handleShowHistory}>
            {showHistory ? "Előzmények elrejtése" : "Korábbi meccseim (Rich Client)"}
        </button>

        {showHistory && (
          <div style={{ 
            marginTop: "10px", 
            maxHeight: "200px", 
            overflowY: "auto", 
            border: "1px solid #ddd", 
            padding: "10px",
            backgroundColor: "#f9f9f9"
          }}>
            {matchHistory.length === 0 ? (
              <p>Még nem játszottál meccset.</p>
            ) : (
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {matchHistory.map((match, index) => (
                  <li key={index} style={{ marginBottom: "8px", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>
                    <strong>{new Date(match.timestamp).toLocaleString()}</strong><br/>
                    Szoba: {match.roomId} | 
                    Nyertes: <span style={{ color: match.winner === playerName ? "green" : "red", fontWeight: "bold" }}>
                      {match.winner}
                    </span>
                    <br/>
                    <small>Játékosok: {match.players ? match.players.join(", ") : "?"}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <button onClick={handleDeleteAccount} style={{ marginTop: "10px", backgroundColor: "red", color: "white" }}> Fiók törlése </button>

    </div>
  );
};

export default IngamePage;
