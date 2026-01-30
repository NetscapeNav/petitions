import "./AddPetition.css";

function AddPetition() {
    return (
        <button className="AddPetition" onClick={() => window.location.href = "add.html"}>
            Разместить свою петицию
        </button>
    );
}

export default AddPetition;