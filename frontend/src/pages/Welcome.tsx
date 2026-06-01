import { useState } from "react"
import { useNavigate } from "react-router-dom";

export default function Welcome() {
    let [username, setUsername] = useState<string>("")
    const navigate = useNavigate();

    // this is probably dumb
    const handleSolve = () => {
        localStorage.setItem("username", username);
        navigate("/solve")
    }

    return (
        <>
            <label htmlFor="username">Enter your chess.com username:
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>

            <button onClick={handleSolve}>
                Solve
            </button>
        </>
    )
}