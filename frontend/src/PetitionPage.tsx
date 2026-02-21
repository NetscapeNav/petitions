import {useState, useEffect} from "react";
import './PetitionPage.css'
import {Link, useParams, useNavigate} from "react-router-dom";
import {API_URL} from "./config";
import { myAlert } from './myAlert';

interface Petition {
    id: number;
    author_id: number;
    header: string;
    location: string;
    text: string;
    signatures_count: number;
    is_signed: number;
}

function PetitionPage() {
    let navigate = useNavigate();
    const {id}  = useParams();
    const [petition, setPetition] = useState<Petition|null>(null);
    const storedId = localStorage.getItem("user_id");
    const userId = storedId ? storedId : "0";

    useEffect(() => {
        if (userId === "0") {
            localStorage.setItem("petition_prev", id ? id : "");
            navigate("/login");
        }

        fetch(`${API_URL}/api/petitions/${id}?user_id=${userId}`, {
            method: "GET",
            credentials: "include",
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.status !== "error") {
                    setPetition(data);
                } else {
                    console.error("Бэкенд вернул ошибку:", data.error);
                    if (data.code === "NO_PETITION") {
                        myAlert.error("Ошибка", "Петиция не существует");
                        navigate("/");
                        return;
                    }
                    if (data.message === "Ошибка авторизации") {
                        navigate("/login");
                        return;
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

        fetch(`${API_URL}/api/sign?petition_id=${id}&user_id=${userId}`, {
            method: "POST",
            credentials: "include",
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
                myAlert.success("Подписано!", "Спасибо за вашу поддержку! Вы можете поделиться петицией с друзьями, чтобы собрать ещё больше подписей");
            } else {
                if (data.code === "ALREADY_SIGNED") {
                    myAlert.error("Ошибка", "Вы уже подписаны на эту петицию!");
                } else if (data.code === "ERROR_LOCATION") {
                    myAlert.error("Ошибка", "Петиция относится к другой местности!");
                } else {
                    myAlert.error("Ошибка", "При подписании произошла ошибка");
                    if (data.message === "Ошибка авторизации") {
                        navigate("/login");
                        return;
                    }
                }
            }
        })
        .catch(error => console.error(error));
    }

    function handleShare(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();

        const url = window.location.href;
        navigator.clipboard.writeText(url)
            .then(() => myAlert.success("Ссылка скопирована", "Ссылка скопирована в буфер обмена!"))
            .catch(err => console.error("Ошибка копирования:", err));
    }

    if (!petition) {
        return (
            <div>Загрузка петиции...</div>
        );
    }

    async function handleAlert() {
        const confirmed = await myAlert.confirm(
            "Подтверждение", 
            "Вы уверены? Это отправит уведомления всем подписавшимся в Telegram", 
            "Да, отправить"
        );
        if (!confirmed) {
            return;
        }

        const message = await myAlert.textarea(
            "Сообщение подписавшимся", 
            "Напишите сообщение подписавшим петицию с информацией о сборе бумажных подписей"
        );

        if (!message) {
            return;
        }

        fetch(`${API_URL}/api/petitions/${id}/notify?user_id=${userId}&message=${encodeURIComponent(message)}`, {
            method: "POST",
            credentials: "include",
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    myAlert.success("Уведомления отправлены", data.message);
                } else {
                    myAlert.error("Ошибка", "При отправке уведомлений произошла ошибка");
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
                    <p className="petitionLocation">Локация петиции: {petition.location}</p>
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