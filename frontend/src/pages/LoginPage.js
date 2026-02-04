import React, { useState } from 'react';
import axios from 'axios';
import { updatePassword } from "../utils/api";
import '../Auth.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/sessions", formData);

      sessionStorage.setItem("authToken", response.data.sessionToken);
      sessionStorage.setItem("userID", response.data.id);
      sessionStorage.setItem("username", response.data.username);
      sessionStorage.setItem("roomId", response.data.roomId);

      alert("Sikeres login, roomId: " + response.data.roomId);
      window.location.href = "/ingame";
    } catch (error) {
      alert("Login failed");
    }
  };

  const handleForgotPassword = async () => {
    const userToReset = prompt("Kérlek add meg a felhasználóneved:");
    if (!userToReset) return;
    const newPass = prompt("Add meg az új jelszót:");
    if (!newPass) return;

    const data = await updatePassword(userToReset, newPass);
    if (data.message) alert(data.message);
    else alert("Hiba: " + (data.error || "Ismeretlen hiba"));
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Bejelentkezés</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            className="auth-input"
            name="username"
            placeholder="Felhasználónév"
            value={formData.username}
            onChange={handleChange}
          />
          <input
            className="auth-input"
            name="password"
            type="password"
            placeholder="Jelszó"
            value={formData.password}
            onChange={handleChange}
          />
          
          <button type="submit" className="auth-button btn-primary">
            Belépés
          </button>
          
          <button 
            type="button" 
            onClick={handleForgotPassword} 
            className="auth-button btn-secondary"
          >
            Elfelejtett jelszó
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;