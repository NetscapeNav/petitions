import React, {useState, useEffect} from "react";
/*import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';*/
import './Petitions.css';
import {Link} from "react-router-dom";

interface Petition {
    id: number;
    header: string;
    text: string;
    pdf_url: string;
    signatures_count: number;
}

function Main() {
    const [petitions, setPetitions] = useState<Petition[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        fetch("http://localhost:8000/api/petitions")
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setPetitions(data);
                } else {
                    console.error("Бэкенд вернул ошибку:", data.error);
                    setPetitions([]);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleRefuse = () => {
        if (currentIndex + 1 < petitions.length) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setCurrentIndex(0);
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
                        <p>{petition.signatures_count} человек уже подписались</p>
                        <div className="Buttons">
                            <Link to={"/petition/" + petition.id} className="PetitionsSign">
                                Подписать
                            </Link>
                            <button className="PetitionsRefuse" onClick={handleRefuse}>
                                Не интересует
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Main;