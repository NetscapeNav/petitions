import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from 'react';
import './App.css';
import Header from "./Header";
import Footer from "./Footer";
import Main from "./Main";
import AddPetitionPage from "./AddPetitionPage";
import PetitionPage from "./PetitionPage";
import Auth from "./Auth";

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
