import "./AddPetitionPage.css"
import {useState, useEffect} from "react";
import {Link, useNavigate} from "react-router-dom";
import { API_URL } from "../../utils/config";
import { myAlert } from '../../utils/myAlert';

function AddPetitionPage() {
    const navigate = useNavigate();
    const storedId = localStorage.getItem("user_id");
    const userId = storedId ? storedId : "0";
    const userLocation = localStorage.getItem("user_region");

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
                myAlert.error("Ошибка", `Общий размер файлов слишком большой! Максимум ${MAX_SIZE_MB} МБ.\nВы выбрали: ${(totalSize / (1024 * 1024)).toFixed(2)} МБ`);
                return;
            }
        }

        if (userId === "0") return;

        const data = new FormData(event.currentTarget);

        data.append("author_id", userId);

        fetch(`${API_URL}/api/petitions/submit`, {
            method: "POST",
            credentials: "include",
            body: data,
        })
            .then(response => response.json())
            .then(result => {
                if (result.status === "success") {
                    myAlert.success("Успешно", "Спасибо за отправку! В ближайшее время мы рассмотрим ваше предложение и свяжемся с вами для дальнейшего сопровождения");
                    navigate("/");
                } else if (result.code === "USER_NOT_FOUND") {
                    myAlert.error("Ошибка", "Ваша сессия истекла или пользователь удален. Пожалуйста, войдите снова");
                    localStorage.removeItem("user_id");
                    navigate("/login");
                    return;
                } else if (result.code === "MAX_SIZE") {
                    myAlert.error("Ошибка", "Общий размер файлов не должен превышать 50 Мб");
                    return;
                } else {
                    myAlert.error("Ошибка", result.message);
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
                <select name="location" required defaultValue={userLocation || "Any"}>
                    <option value="" disabled>Выберите место проведения</option>
                    {userLocation === "NSU" && <option value="NSU">НГУ</option>}
                    {userLocation === "IRK" && <option value="IRK">ИрНИТУ</option>}
                    {userLocation === "SPB" && <option value="SPB">Санкт-Петербург</option>}
                    {userLocation === "other" && <option value="other">Другое</option>}
                    <option value="Any">Любая</option>
                </select>
                <label htmlFor="header">Название петиции</label>
                <input type="text" id="header" placeholder="Напишите сюда..." name="header" maxLength={200} required/>
                <label htmlFor="text">Текст петиции</label>
                <textarea id="text" placeholder="Напишите сюда..." name="text" maxLength={1000000} required></textarea>
                <label htmlFor="file">Файлы к петиции</label>
                <input className="FilesInput" type="file" id="file" name="files" multiple/>
                <button className="PetitionSubmit" type="submit">Отправить</button>
            </form>
        </div>
    );
}

export default AddPetitionPage;