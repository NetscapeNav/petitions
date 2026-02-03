import "./AddPetitionPage.css"
import {useState, useEffect} from "react";
import {Link, useNavigate} from "react-router-dom";

function AddPetitionPage() {
    const navigate = useNavigate();
    const token = localStorage.getItem("auth_token");
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

        const form = event.currentTarget;
        const fileInput = form.elements.namedItem('files') as HTMLInputElement;

        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            let totalSize = 0;
            const MAX_SIZE_MB = 50;

            for (let i = 0; i < fileInput.files.length; i++) {
                totalSize += fileInput.files[i].size;
            }

            if (totalSize > MAX_SIZE_MB * 1024 * 1024) {
                alert(`Общий размер файлов слишком большой! Максимум ${MAX_SIZE_MB} МБ.\nВы выбрали: ${(totalSize / (1024 * 1024)).toFixed(2)} МБ`);
                return;
            }
        }

        if (userId === "0") return;

        const data = new FormData(event.currentTarget);

        data.append("author_id", userId);
        data.append("token", token || "");

        fetch("http://localhost:8000/api/petitions/submit", {
            method: "POST",
            body: data,
        })
            .then(response => response.json())
            .then(result => {
                if (result.status === "success") {
                    alert("Спасибо за отправку! В ближайшее время мы рассмотрим ваше предложение и свяжемся с вами для дальнейшего сопровождения");
                    navigate("/");
                } else if (result.code === "USER_NOT_FOUND") {
                    alert("Ваша сессия истекла или пользователь удален. Пожалуйста, войдите снова");
                    localStorage.removeItem("user_id");
                    navigate("/login");
                    return;
                } else if (result.code === "MAX_SIZE") {
                    alert("Общий размер файлов не должен превышать 50 Мб");
                    return;
                } else {
                    alert(result.message);
                    return;
                }
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
                <select name="location" required defaultValue="">
                    <option value="" disabled>Выберите место проведения</option>
                    <option value="NSU">НГУ</option>
                    <option value="IRNITU">ИрНИТУ</option>
                    <option value="SPB">Санкт-Петербург</option>
                    <option value="other">Другое</option>
                </select>
                <label htmlFor="header">Название петиции</label>
                <input type="text" id="header" placeholder="Напишите сюда..." name="header" required/>
                <label htmlFor="text">Текст петиции</label>
                <textarea id="text" placeholder="Напишите сюда..." name="text" required></textarea>
                <label htmlFor="file">Файл PDF</label>
                <input type="file" id="file" name="files" multiple/>
                <button className="PetitionSubmit" type="submit">Отправить</button>
            </form>
        </div>
    );
}

export default AddPetitionPage;