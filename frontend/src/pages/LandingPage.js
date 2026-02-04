import React from 'react';
import { Link } from 'react-router-dom';
import '../Auth.css';

const LandingPage = () => {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Skatch Kártyajáték</h1>
        <p className="auth-text">Üdvözöllek! Kérlek válassz:</p>
        <div style={{ marginTop: '20px' }}>
          <Link to="/login" className="auth-link">Bejelentkezés</Link>
          <span style={{color: '#ccc'}}>|</span>
          <Link to="/registration" className="auth-link">Regisztráció</Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;