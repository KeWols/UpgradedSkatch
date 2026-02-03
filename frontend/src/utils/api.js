// RESTful API client – resource-based URLs and HTTP methods

const API_BASE = "/api";

// Rooms
export async function createRoom() {
  const response = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

export async function getRoom(roomId) {
  const response = await fetch(`${API_BASE}/rooms/${roomId}`);
  return response.json();
}

export async function joinRoom(roomId, playerName) {
  const response = await fetch(`${API_BASE}/rooms/${roomId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  return response.json();
}

// Users (registration)
export async function registerUser(username, password) {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

// Sessions (login)
export async function createSession(username, password) {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function deleteRoom(roomId) {
  const response = await fetch(`${API_BASE}/rooms/${roomId}`, {
    method: "DELETE",
  });
  return response.json();
}

export async function updatePassword(username, newPassword) {
  const response = await fetch(`${API_BASE}/users/${username}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
  return response.json();
}

export async function deleteUser(username) {
  const response = await fetch(`${API_BASE}/users/${username}`, {
    method: "DELETE",
  });
  return response.json();
}

