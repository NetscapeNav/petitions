import {useState, useEffect} from "react";
import './Auth.css'
import {Link, useParams, useNavigate} from "react-router-dom";

interface TelegramUser {
    id: number;
    first_name: string;
    username?: string;
    hash: string;
}

declare global {
    interface Window {
        onTelegramAuth?: (user: TelegramUser) => void;
    }
}

function Auth() {
    let navigate = useNavigate();
    const petitionPrev = localStorage.getItem('petition_prev');
    const petition = petitionPrev ? petitionPrev : "";
    const [id, setId] = useState(0);

    useEffect(() => {
        window.onTelegramAuth = (user: TelegramUser) => {
            console.log("Телеграм вернул пользователя:", user);

            try {
                fetch("http://localhost:8000/api/login", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(user),
                })
                    .then((res) => res.json())
                    .then(data => {
                        console.log(data);
                        if (data.status === "success") {
                            localStorage.setItem("user_id", data.user_id);
                            localStorage.removeItem('petition_prev');
                            if (petition === "") {
                                navigate("/");
                            } else if (petition === "add") {
                                navigate("/add");
                            } else {
                                navigate(`/petition/${petition}`);
                            }
                        } else {
                            alert("Ошибка входа: " + (data.error || data.message));
                        }
                    })
                    .catch(err => console.log(err));
            } catch (e) {
                console.log("Error:", e);
            }
            alert(`Привет, ${user.first_name}! Твой ID: ${user.id}`);
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.async = true;

        script.setAttribute("data-telegram-login", "petitions_sep_bot");
        script.setAttribute("data-size", "large");
        script.setAttribute("data-request-access", "write");
        script.setAttribute("data-onauth", "onTelegramAuth(user)");

        const container = document.getElementById("telegram-login-container");
        if (container) {
            container.append(script);
        } else {
            console.log("Ошибка загрузки виджета Telegram");
        }

        return () => {
            if (container) {
                container.innerHTML = '';
            }
            delete window.onTelegramAuth;
        };
    }, []);

    return (
        <div className="AuthDiv">
            <h1>Вход через Telegram</h1>
            <p>Для подписания петиции необходимо подтвердить личность</p>

            <div className="AuthContainer" id="telegram-login-container"></div>
        </div>
    );
}

export default Auth;