import React, { useState } from 'react';
import axios from 'axios';
import '../Auth.css';

const RegistrationPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegistration = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/users", { username, password });
      alert(response.data.message);
      window.location.href = '/login';
    } catch (error) {
        if (error.response) alert(error.response.data.error);
        else alert('Regisztrációs hiba');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Regisztráció</h2>
        <form onSubmit={handleRegistration} className="auth-form">
          <input
            className="auth-input"
            type="text"
            placeholder="Felhasználónév"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button type="submit" className="auth-button btn-primary">
            Regisztráció
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;