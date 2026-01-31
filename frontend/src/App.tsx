import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from 'react';
import './App.css';
import Header from "./Header";
import Footer from "./Footer";
import Main from "./Main";
import AddPetitionPage from "./AddPetitionPage";

function App() {
  return (
      <BrowserRouter>
          <div className="App">
              <Header/>
              <main>
                  <Routes>
                      <Route path="/" element={<Main/>}/>
                      <Route path="/add" element={<AddPetitionPage/>}/>
                  </Routes>
              </main>
              <Footer/>
          </div>
      </BrowserRouter>
  );
}

export default App;
