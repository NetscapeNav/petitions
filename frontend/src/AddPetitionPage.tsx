import "./AddPetitionPage.css"
import {useState, useEffect} from "react";
import {Link, useNavigate} from "react-router-dom";

function AddPetitionPage() {
    const navigate = useNavigate();
    const storedId = localStorage.getItem("user_id");
    const userId = storedId ? storedId : "0";

    useEffect(() => {
        if (userId === "0") {
            localStorage.setItem("petition_prev", "add");
            navigate("/login");
        }
    }, [userId, navigate]);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (userId === "0") return;

        const data = new FormData(event.currentTarget);

        fetch("http://localhost:8000/api/petitions/submit", {
            method: "POST",
            body: data,
        })
            .then(response => response.json())
            .then(result => {
                alert("Спасибо за отправку! В ближайшее время мы рассмотрим ваше предложение и свяжемся с вами для дальнейшего сопровождения.");
                navigate("/");
            })
            .catch(err => console.error(err));
    }

    if (userId === "0") {
        return null;
    }

    return (
        <div className="AddPetitionPage">
            <Link to="/" className="ButtonBack">
                ← Назад
            </Link>
            <h1 className="AddPetitionHeader">Подайте <i>свою</i> петицию</h1>
            <form className="AddPetitionForm" onSubmit={handleSubmit}>
                <label htmlFor="location">Локация проведения</label>
                <select name="location" required>
                    <option selected disabled>Выберите место проведения</option>
                    <option value="NSU">НГУ</option>
                    <option value="IRNITU">ИрНИТУ</option>
                    <option value="SPB">Санкт-Петербург</option>
                    <option value="other">Другое</option>
                </select>
                <label htmlFor="header">Название петиции</label>
                <input type="text" id="header" placeholder="Напишите сюда..." name="header" required/>
                <label htmlFor="text">Текст петиции</label>
                <textarea id="text" placeholder="Напишите сюда..." name="text" required></textarea>
                <label htmlFor="feedback">Обратная связь</label>
                <input type="text" id="feedback" placeholder="Напишите сюда..." name="feedback" required/>
                <label htmlFor="file">Файл PDF</label>
                <input type="file" id="file" name="file"/>
                <button className="PetitionSubmit" type="submit">Отправить</button>
            </form>
        </div>
    );
}

export default AddPetitionPage;