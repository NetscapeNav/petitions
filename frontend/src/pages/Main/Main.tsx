import Petitions from "../Petitions/Petitions";
import {Link} from "react-router-dom";
import React from "react";
import './Main.css';
import Header from "../../components/Header/Header";

function Main() {
    return (
        <div className="MainContainer">
        <Header/>
        <div className="Main">
            <Petitions/>
            <Link to="/add" className="AddPetition">
                Разместить свою петицию
            </Link>
        </div>
        </div>
    );
}

export default Main;