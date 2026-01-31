import {useState, useEffect} from "react";
import './PetitionPage.css'
import {Link, useParams} from "react-router-dom";

interface Petition {
    header: string;
    text: string;
    signatures_count: number;
}

function PetitionPage() {
    const {id}  = useParams();
    const [petition, setPetition] = useState<Petition|null>(null);

    useEffect(() => {
        fetch(`http://localhost:8000/api/petitions/${id}`)
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    setPetition(data);
                } else {
                    console.error("Бэкенд вернул ошибку:", data.error);
                }})
            .catch(error => console.log(error));
    }, [id]);

    if (!petition) {
        return (
            <div>Загрузка петиции...</div>
        );
    }

    return (
        <div className="PetitionInfo">
            <div className="PetitionHeaderDiv">
                <Link to="/" className="ButtonBack">
                    ← Назад
                </Link>
                <h1 className="PetitionInfoTitle">{petition.header}</h1>
                <div className="ActionDiv">
                    <p className="signaturesCount">{petition.signatures_count} человек уже подписали</p>
                    <Link to="/sign" className="ButtonsSign">
                        Подписать
                    </Link>
                </div>
            </div>
            <p className="Text">{petition.text}</p>
        </div>
    )
}

export default PetitionPage;