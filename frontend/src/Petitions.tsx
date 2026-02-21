import React, {useState, useEffect} from "react";
import './Petitions.css';
import {Link, useNavigate} from "react-router-dom";
import {API_URL} from "./config";

interface Petition {
    id: number;
    header: string;
    text: string;
    pdf_url: string;
    signatures_count: number;
    is_signed: number;
}

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function Petitions() {
    const navigate = useNavigate();
    const [petitions, setPetitions] = useState<Petition[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const storedId = localStorage.getItem("user_id");
    const userId = (storedId && storedId !== "undefined") ? storedId : "0";

    useEffect(() => {
        fetch(`${API_URL}/api/petitions?user_id=${userId}`, {
            method: "GET",
            credentials: "include",
        })
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setPetitions(shuffleArray(data));
                } else {
                    console.error("Бэкенд вернул ошибку:", data.error);
                    setPetitions([]);
                }
            })
            .catch(err => console.error(err));
    }, [userId]);

    const handleRefuse = () => {
        if (currentIndex + 1 < petitions.length) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setCurrentIndex(0);
        }
    }

    const handleActionCheck = (id: number) => {
        if (userId === "0") {
            navigate(`/login`);
        } else {
            navigate(`/petition/${id}`);
        }
    }

    if (petitions.length === 0) {
        return <div className="PetitionsDiv">Загрузка петиций...</div>;
    }

    const petition = petitions[currentIndex];

    return (
        <>
            <div className="PetitionsDiv">
                <div className="old-2"></div>
                <div className="old-1"></div>
                <div className="Petition" key={petition.id}>
                    <h3 className="PetitionsHeader">{petition.header}</h3>
                    <p className="PetitionsText">{petition.text}</p>
                    <div className="ButtonsAndNumber">
                        <p className="SignaturesCount">{petition.signatures_count} человек
                            {petition.is_signed === 1 ? " (вы тоже!) " : " "}
                            уже подписались</p>
                        <div className="Buttons">
                            <span onClick={() => handleActionCheck(petition.id)}
                                  className={!petition.is_signed ? "PetitionsSign" : "PetitionWatch"}>
                                {!petition.is_signed ? "Подписать" : "Посмотреть"}
                            </span>
                            <button className="PetitionsRefuse" onClick={handleRefuse}>
                                Не интересует
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
)
    ;
}

export default Petitions;