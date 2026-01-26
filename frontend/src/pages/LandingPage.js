import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div>
      <h1>Landing Page</h1>
      <p>
        <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default LandingPage;
