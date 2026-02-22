import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from 'react';
import './assets/App.css';
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import Main from "./pages/Main/Main";
import AddPetitionPage from "./pages/AddPetitionPage/AddPetitionPage";
import PetitionPage from "./pages/PetitionPage/PetitionPage";
import Auth from "./pages/Auth/Auth";

function App() {
  return (
      <BrowserRouter>
          <div className="App">
              <main>
                  <Routes>
                      <Route path="/" element={<Main/>}/>
                      <Route path="/add" element={<AddPetitionPage/>}/>
                      <Route path="/petition/:id" element={<PetitionPage/>}/>
                      <Route path="/login" element={<Auth/>}/>
                  </Routes>
              </main>
              <Footer/>
          </div>
      </BrowserRouter>
  );
}

export default App;
