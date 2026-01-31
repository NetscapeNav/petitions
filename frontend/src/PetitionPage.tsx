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

    function handleSign(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        fetch(`http://localhost:8000/api/sign?petition_id=${id}`, {
            method: "POST",
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.status === "success") {
                    alert("Спасибо за подписку!");
                } else {
                    if (data.status === "error1062") {
                        alert("Вы уже подписаны на эту петицию!");
                    }
                    console.error("Бэкенд вернул ошибку:", data.error);
                }
            })
            .catch(error => console.log(error));
    }

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
                    <button onClick={handleSign} className="ButtonsSign">
                        Подписать
                    </button>
                </div>
            </div>
            <p className="Text">{petition.text}</p>
        </div>
    )
}

export default PetitionPage;