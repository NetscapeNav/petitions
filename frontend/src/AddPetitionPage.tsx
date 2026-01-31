import "./AddPetitionPage.css"
import {useState, useEffect} from "react";
import {Link} from "react-router-dom";

function AddPetitionPage() {

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        fetch("http://localhost:8000/api/petitions/submit", {
            method: "POST",
            body: data,
        })
            .then(response => response.json())
            .then(result => alert("Спасибо за отправку! Мы рассмотрим ваше предложение в ближайшее время и свяжемся с вами."))
            .catch(err => console.error(err));
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