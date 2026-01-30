import {useState, useEffect} from "react";
import './Header.css';

function Header() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        fetch("http://localhost:8000/api/petitions/count")
            .then(response => response.json())
            .then(data => setCount(data))
            .catch(err => console.error(err))
    }, []);

    return (
        <div className="Header">
            <h1 className="h1">Решите <i>одним кликом</i><br/>
                {count} вопросов</h1>
        </div>
    );
}

export default Header;