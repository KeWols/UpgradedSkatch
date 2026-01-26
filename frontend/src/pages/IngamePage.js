import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { connectWebSocket, disconnectWebSocket, getSocket } from "../utils/websocket";
import { joinRoom } from "../utils/api";
import Chat from "../components/Chat";
import VoiceChat from "../components/VoiceChat";
import MicTest from "../components/MicTest";

const IngamePage = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState(sessionStorage.getItem("roomId") || "");
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("username") || "");

  // A szobában lévő játékosok listája
  const [players, setPlayers] = useState([]);
  const [readyPlayers, setReadyPlayers] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [socket, setSocket] = useState(null);

  // További state-k
  const [joinRoomIdInput, setJoinRoomIdInput] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!playerName) {
      alert("Nincs bejelentkezve. Visszairányítás...");
      navigate("/login");
    }
  }, [playerName, navigate]);

  // WebSocket létrehozása
  useEffect(() => {
    if (!roomId || !playerName) return;

    console.log("⚡ IngamePage: létrehozunk egy WS kapcsolatot...");
    const s = connectWebSocket(roomId, playerName);
    setSocket(s);
  }, [roomId, playerName]);

  // userJoined, userLeft stb.
  useEffect(() => {
    const ws = getSocket();
    if (!ws) return;

    function handleUserJoined(data) {
      if (data.roomId === roomId) {
        setPlayers([...data.players]);
      }
    }
    function handleUserLeft(data) {
      if (data.roomId === roomId) {
        setPlayers([...data.players]);
      }
    }
    function handleReceiveMessage(msg) {
      setChatLog((prev) => [...prev, msg]);
    }

    ws.on("userJoined", handleUserJoined);
    ws.on("userLeft", handleUserLeft);
    ws.on("receiveMessage", handleReceiveMessage);

    return () => {
      ws.off("userJoined", handleUserJoined);
      ws.off("userLeft", handleUserLeft);
      ws.off("receiveMessage", handleReceiveMessage);
    };
  }, [roomId]);

  // ready esemény
  useEffect(() => {
    const ws = getSocket();
    if (!ws) return;

    function handlePlayerReady(data) {
      if (data.readyPlayers) {
        setReadyPlayers([...data.readyPlayers]);
      }
      // Ha mindenki ready
      if (data.readyPlayers.length === players.length && players.length > 0) {
        console.log("🎲 Minden játékos Ready! Indul a Skatch játék!");
        // Itt megyünk át a SkatchCardGame oldalra, átadva a players és roomId adatokat
        navigate("/skatch-game", {
          state: {
            roomId,
            players,
          },
        });
      }
    }

    function handleStartGame({ gameRoomId }) {
      ws.emit("join_room", { roomId: gameRoomId, playerName });
      // Ugyanaz, mint fentebb, de ha a szerver indítja el a startGame eseményt
      navigate("/skatch-game", {
        state: {
          roomId: gameRoomId,
          players,
        },
      });
    }

    ws.on("playerReady", handlePlayerReady);
    ws.on("startGame", handleStartGame);

    return () => {
      ws.off("playerReady", handlePlayerReady);
      ws.off("startGame", handleStartGame);
    };
  }, [roomId, players, navigate]);

  // JoinAnotherRoom
  const handleJoinAnotherRoom = async () => {
    if (!joinRoomIdInput.trim()) return;
    const response = await joinRoom(joinRoomIdInput, playerName);
    if (response.error) {
      alert(response.error);
      return;
    }
    setRoomId(response.roomId);
    sessionStorage.setItem("roomId", response.roomId);

    // Ha a backend visszaadja a players tömböt:
    if (response.players) {
      setPlayers([...response.players]);
    }

    // Lecsatlakozás, reconnect
    disconnectWebSocket();
    setSocket(null);
    setIsReady(false);
    setJoinRoomIdInput("");
  };

  const handleLogout = () => {
    sessionStorage.clear();
    disconnectWebSocket();
    setSocket(null);
    navigate("/");
  };

  const sendMessage = (message) => {
    const ws = getSocket();
    if (ws && ws.connected) {
      ws.emit("send_message", { roomId, playerName, message });
    }
  };

  const handleReady = () => {
    const ws = getSocket();
    if (ws && ws.connected) {
      ws.emit("player_ready", { roomId, playerName });
      setIsReady(true);
    }
  };

  const playerCount = players.length;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Ingame Page</h2>
      <p><strong>Room:</strong> {roomId}</p>
      <p><strong>Player:</strong> {playerName}</p>
      <p><strong>Players in this room:</strong> {players.join(", ")}</p>

      <button onClick={handleReady} disabled={isReady}>
        {isReady ? "Ready! ✅" : "Ready!"}
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

      {/* VoiceChat: csak ha 2 játékos van és csatlakozott */}
      {(playerCount === 2 && socket?.connected) && (
        <VoiceChat
          socket={socket}
          roomId={roomId}
          playerName={playerName}
          playerCount={playerCount}
        />
      )}

      <MicTest />
    </div>
  );
};

export default IngamePage;
