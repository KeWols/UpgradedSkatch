// skatch/frontend/src/pages/RegistrationPage.js

import React, { useState } from 'react';
import axios from 'axios';

const RegistrationPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegistration = async (e) => {
    e.preventDefault();
    try {
      
      const response = await axios.post("/api/users", { username, password });

      alert(response.data.message);
      // Sikeres regisztráció után átirányítás:
      window.location.href = '/login';
    } catch (error) {
      if (error.response) {
        alert(error.response.data.error);
      } else {
        alert('Regisztrációs hiba');
      }
    }
  };

  return (
    <div>
      <h2>Regisztráció</h2>
      <form onSubmit={handleRegistration}>
        <input
          type="text"
          placeholder="Felhasználónév"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">Regisztráció</button>
      </form>
    </div>
  );
};

export default RegistrationPage;
