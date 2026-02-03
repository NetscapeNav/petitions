import {useState, useEffect} from "react";
import './PetitionPage.css'
import {Link, useParams, useNavigate} from "react-router-dom";

interface Petition {
    id: number;
    author_id: number;
    header: string;
    text: string;
    signatures_count: number;
    is_signed: number;
}

function PetitionPage() {
    let navigate = useNavigate();
    const {id}  = useParams();
    const [petition, setPetition] = useState<Petition|null>(null);
    const token = localStorage.getItem("auth_token");
    const storedId = localStorage.getItem("user_id");
    const userId = storedId ? storedId : "0";

    useEffect(() => {
        if (userId === "0") {
            localStorage.setItem("petition_prev", id ? id : "");
            navigate("/login");
        }

        fetch(`http://localhost:8000/api/petitions/${id}?user_id=${userId}`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (!data.error) {
                    setPetition(data);
                } else {
                    console.error("Бэкенд вернул ошибку:", data.error);
                    if (data.error === "No petition") {
                        alert("Петиция не существует");
                    }
                }})
            .catch(error => console.log(error));
    }, [id, userId]);

    function handleSign(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();

        if (userId === "0") {
            localStorage.setItem("petition_prev", id ? id : "");
            navigate("/login");
            return;
        }

        fetch(`http://localhost:8000/api/sign?petition_id=${id}&user_id=${userId}&token=${token}`, {
            method: "POST",
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.status === "success") {
                setPetition(prev => prev ? {
                    ...prev,
                    signatures_count: prev.signatures_count + 1,
                    is_signed: 1,
                } : null);
                alert("Спасибо за подписку!");
            } else {
                if (data.status === "error1062") {
                    alert("Вы уже подписаны на эту петицию!");
                } else if (data.status === "errorloc") {
                    alert("Петиция относится к другой местности!");
                }
            }
        })
        .catch(error => console.error(error));
    }

    function handleShare(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();

        const url = window.location.href;
        navigator.clipboard.writeText(url)
            .then(() => alert("Ссылка скопирована в буфер обмена!"))
            .catch(err => console.error("Ошибка копирования:", err));
    }

    if (!petition) {
        return (
            <div>Загрузка петиции...</div>
        );
    }

    function handleAlert() {
        if (!window.confirm("Вы уверены? Это отправит уведомления всем подписавшимся в Telegram")) {
            return;
        }

        let message = window.prompt("Напишите сообщение подписавшим петицию с информацией о сборе бумажных подписей", "");

        if (message === null) {
            message = "";
        }

        if (message.trim() === "") {
            alert("Отправить пустое сообщение нельзя");
            return;
        }

        fetch(`http://localhost:8000/api/petitions/${id}/notify?user_id=${userId}&token=${token}&message=${encodeURIComponent(message)}`, {
            method: "POST"
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    alert(data.message);
                } else {
                    alert("При отправке произошла ошибка");
                }
            })
            .catch(error => console.error(error));
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
                    <div className="ActionDivButtons">
                        <button onClick={handleSign} disabled={petition.is_signed === 1}
                                className={!petition.is_signed ? "ButtonsSign" : "ButtonsSigned"}>
                            {!petition.is_signed ? "Подписать" : "Подписано"}
                        </button>
                        {petition.is_signed === 1 && (
                            <button onClick={handleShare} className="ButtonsShare">
                                Поделиться
                            </button>
                        )}
                        {(parseInt(userId) === petition.author_id && petition.signatures_count > 0) && (
                                <button onClick={handleAlert} className="ButtonsAlert">
                                    Позвать всех
                                </button>
                        )}
                    </div>
                </div>
            </div>
            <p className="Text">{petition.text}</p>
        </div>
    )
}

export default PetitionPage;