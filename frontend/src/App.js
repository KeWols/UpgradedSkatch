import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import IngamePage from "./pages/IngamePage";
import SkatchCardGame from "./pages/SkatchCardGame";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/ingame" element={<IngamePage />} />
        <Route path="/skatch-game" element={<SkatchCardGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;