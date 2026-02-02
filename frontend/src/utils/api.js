export async function createRoom() {
  const response = await fetch("/api/create-room", {
    method: "POST",
  });
  return response.json();
}

export async function registerUser(username, password) {
  const response = await fetch("/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function joinRoom(roomId, playerName) {
  const response = await fetch("/api/join-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, playerName }),
  });
  return response.json();
}
