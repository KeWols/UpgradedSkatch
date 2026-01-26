// frontend/src/components/Chat.js
import React, { useState } from "react";

const Chat = ({ chatLog, onSendMessage }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text);
    setText("");
  };

  return (
    <div style={{ marginTop: "20px", border: "1px solid gray", padding: "10px" }}>
      <h3>Chat</h3>
      <div style={{ height: "150px", overflowY: "auto", marginBottom: "8px" }}>
        {chatLog.map((msg, index) => (
          <div key={index}>
            <strong>{msg.playerName}:</strong> {msg.message}
          </div>
        ))}
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Írj üzenetet..."
      />
      <button onClick={handleSend}>Küld</button>
    </div>
  );
};

export default Chat;
