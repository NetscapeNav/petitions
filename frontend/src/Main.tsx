import Petitions from "./Petitions";
import {Link} from "react-router-dom";
import React from "react";
import './Main.css';
import Header from "./Header";

function Main() {
    return (
        <>
        <Header/>
        <div className="Main">
            <Petitions/>
            <Link to="/add" className="AddPetition">
                Разместить свою петицию
            </Link>
        </div>
        </>
    );
}

export default Main;