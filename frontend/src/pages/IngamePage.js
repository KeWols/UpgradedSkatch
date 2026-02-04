import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWebSocket, disconnectWebSocket } from "../utils/websocket";
import { joinRoom } from "../utils/api";
import { deleteUser } from "../utils/api";
import Chat from "../components/Chat";
import VoiceChat from "../components/VoiceChat";
import '../Ingame.css';

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
      const { gameRoomId, players: serverPlayers, deckSize, dealerIndex, turnIndex, cardsPerPlayer, currentTurn } = payload || {};
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
    <div className="ingame-wrapper">
      <div className="dashboard-card">
        
        {/* Fejléc és Kilépés */}
        <div className="dashboard-header">
          <h2>Lobby</h2>
          {!isReady && (
            <button onClick={handleLogout} className="btn btn-secondary">
              Kilépés
            </button>
          )}
        </div>

        {/* Információs panelek */}
        <div className="info-panel">
          <div className="info-item">
            <strong>Szoba azonosító:</strong>
            <span>{roomId}</span>
          </div>
          <div className="info-item">
            <strong>Játékos név:</strong>
            <span>{playerName}</span>
          </div>
        </div>

        {/* Játékos lista */}
        <div className="players-list">
          <strong>Jelenlévők:</strong> {players.join(", ")}
        </div>

        {/* Ready Gomb és Státusz */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={handleReady} 
            disabled={isReady} 
            className={`btn ${isReady ? 'btn-success' : 'btn-primary'}`}
            style={{ flex: 1 }}
          >
            {isReady ? "Várakozás a többiekre..." : "KÉSZ (Ready)"}
          </button>
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Készen állnak: {readyPlayers.length > 0 ? readyPlayers.join(", ") : "Senki"}
          </div>
        </div>

        {/* Szobaváltás */}
        <div className="action-group">
          <input
            className="game-input"
            type="text"
            placeholder="Másik szoba ID..."
            value={joinRoomIdInput}
            onChange={(e) => setJoinRoomIdInput(e.target.value)}
          />
          <button onClick={handleJoinAnotherRoom} className="btn btn-warning">
            Átlépés
          </button>
        </div>

        {/* Kommunikációs Szekció */}
        <div className="communication-area">
          <Chat chatLog={chatLog} onSendMessage={sendMessage} />
          
          {playerCount === 2 && socket?.connected && (
            <VoiceChat
              socket={socket}
              roomId={roomId}
              playerName={playerName}
              playerCount={playerCount}
            />
          )}
        </div>

        {/* History (Előzmények) Szekció */}
        <div className="history-section">
          <button onClick={handleShowHistory} className="btn btn-secondary" style={{width: '100%'}}>
              {showHistory ? "Előzmények elrejtése" : "Korábbi meccseim megtekintése"}
          </button>

          {showHistory && (
            <div className="history-list">
              {matchHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>Még nem játszottál meccset.</p>
              ) : (
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {matchHistory.map((match, index) => (
                    <li key={index} className="history-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong>{new Date(match.timestamp).toLocaleString()}</strong>
                        <span style={{ backgroundColor: '#eee', padding: '2px 6px', borderRadius: '4px' }}>Szoba: {match.roomId}</span>
                      </div>
                      <div>
                        Nyertes: <span style={{ color: match.winner === playerName ? "green" : "red", fontWeight: "bold" }}>
                          {match.winner}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                        Játékosok: {match.players ? match.players.join(", ") : "?"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Fiók törlése */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
           <button onClick={handleDeleteAccount} className="btn btn-danger" style={{ fontSize: '0.8em' }}>
             Fiók végleges törlése
           </button>
        </div>

      </div>
    </div>
  );
};

export default IngamePage;