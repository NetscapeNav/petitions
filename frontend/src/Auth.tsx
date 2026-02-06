import {useState, useEffect} from "react";
import './Auth.css'
import {Link, useParams, useNavigate, Form} from "react-router-dom";

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
    const [userId, setUserId] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [token, setToken] = useState("");
    const [step, setStep] = useState<'telegram' | 'email' | 'code'>('telegram');

    useEffect(() => {
        if (step !== "telegram") return;

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
                            setUserId(data.user_id);
                            setToken(data.user_token);
                            if (!data.is_verified) {
                                setStep("email");
                            } else {
                                localStorage.setItem("user_id", data.user_id);
                                localStorage.setItem("auth_token", data.user_token);
                                localStorage.removeItem('petition_prev');
                                if (petition === "") {
                                    navigate("/");
                                } else if (petition === "add") {
                                    navigate("/add");
                                } else {
                                    navigate(`/petition/${petition}`);
                                }
                            }
                        } else {
                            alert("Ошибка входа: " + (data.error || data.message));
                        }
                    })
                    .catch(err => console.log(err));
            } catch (e) {
                console.log("Error:", e);
            }
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
    }, [step]);

    function handleEmail() {
        const formData = new FormData();
        formData.append("user_id", userId || "");
        formData.append("email", email);
        formData.append("token", token || "");

        fetch("http://localhost:8000/api/verify/request", {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then(data => {
                if (data.status === "success") {
                    setStep("code");
                } else {
                    alert(data.message);
                }
            })
            .catch(err => console.error(err));
    }

    function handleCode() {
        const formData = new FormData();

        formData.append("user_id", userId || "");
        formData.append("code", code || "");
        formData.append("token", token || "");

        fetch("http://localhost:8000/api/verify/confirm", {
            method: "POST",
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    if (userId) {
                        localStorage.setItem("user_id", userId);
                        localStorage.setItem("auth_token", data.user_token);
                    }
                    localStorage.removeItem('petition_prev');
                    if (petition === "") {
                        navigate("/");
                    } else if (petition === "add") {
                        navigate("/add");
                    } else {
                        navigate(`/petition/${petition}`);
                    }
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error(error));
    }

    return (
        <>
            {(step === "telegram") && (
                <div className="AuthDiv">
                    <h1>Вход через Telegram</h1>
                    <p>Для подписания петиции необходимо подтвердить личность</p>

                    <div className="AuthContainer" id="telegram-login-container"></div>
                </div>
            )}

            {(step === "email") && (
                <div className="AuthDiv">
                    <h1>Подтверждение через email</h1>
                    <p>Для участия в локальных петициях нужно подтвердить вашу локацию</p>

                    <div className="AuthContainer" id="email-container">
                        <input name="email" type="email" value={email}
                               onChange={(e) => setEmail(e.target.value)}/>
                        <button onClick={handleEmail} type="submit">
                            Отправить
                        </button>
                    </div>
                </div>
            )}

            {(step === "code") && (
                <div className="AuthDiv">
                    <h1>Подтверждение через email</h1>

                    <p>Код отправлен на вашу электронную почту</p>

                    <div className="AuthContainer" id="code-container">
                        <input name="code" type="text" value={code}
                               onChange={(e) => setCode(e.target.value)}
                                placeholder="Код"/>
                        <button onClick={handleCode} type="submit">
                            Отправить
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Auth;