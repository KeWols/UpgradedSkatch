export async function createRoom() {
  const response = await fetch("http://localhost:3000/api/create-room", {
      method: "POST"
  });
  return response.json();
}

export async function registerUser(username, password) {
  const response = await fetch("http://localhost:3000/users/register", { // 🔹 5000 helyett 3000!
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
  });
  return response.json();
}

export async function joinRoom(roomId, playerName) {
  const response = await fetch("http://localhost:3000/api/join-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, playerName }),
  });
  return response.json();
}
