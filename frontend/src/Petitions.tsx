import {useState, useEffect} from "react";
/*import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';*/
import './Petitions.css';

interface Petition {
    id: number;
    header: string;
    text: string;
    pdf_url: string;
    signatures_count: number;
}

function Main() {
    const [petitions, setPetitions] = useState<Petition[]>([]);

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

    return (
        <div className="PetitionsDiv">
            {petitions.map((petition) => (
                <div className="Petition" key={petition.id}>
                    <h3 className="PetitionsHeader">{petition.header}</h3>
                    <p className="PetitionsText">{petition.text}</p>
                    <p>{petition.signatures_count} человек уже подписались</p>
                    <div className="Buttons">
                        <button className="PetitionsSign" onClick={() => {
                            window.location.href = petition.pdf_url
                        }}>
                            Подписать
                        </button>
                        <button className="PetitionsRefuse">
                            Не интересует
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Main;