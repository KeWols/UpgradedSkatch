// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/sessions", formData);

      console.log("Login response:", response.data);

      // Eltároljuk az infókat
      sessionStorage.setItem("authToken", response.data.sessionToken);
      sessionStorage.setItem("userID", response.data.id);
      sessionStorage.setItem("username", response.data.username);
      sessionStorage.setItem("roomId", response.data.roomId);  // <- új random szoba

      alert("Sikeres login, roomId: " + response.data.roomId);
      window.location.href = "/ingame";
    } catch (error) {
      alert("Login failed");
    }
  };

  return (
    <div>
      <h2>Bejelentkezés</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Felhasználónév"
          value={formData.username}
          onChange={handleChange}
        />
        <br/>
        <input
          name="password"
          type="password"
          placeholder="Jelszó"
          value={formData.password}
          onChange={handleChange}
        />
        <br/>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
