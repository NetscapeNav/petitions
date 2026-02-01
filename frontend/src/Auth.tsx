import {useState, useEffect} from "react";
import './Auth.css'
import {Link, useParams} from "react-router-dom";

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
    const [id, setId] = useState(0);

    useEffect(() => {
        window.onTelegramAuth = (user: TelegramUser) => {
            console.log("Ура! Телеграм вернул пользователя:", user);
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

    function authorize() {

    }

    return (
        <div className="AuthDiv">
            <h1>Вход через Telegram</h1>
            <p>Для подписания петиции необходимо подтвердить личность</p>

            <div id="telegram-login-container"></div>
        </div>
    );
}

export default Auth;