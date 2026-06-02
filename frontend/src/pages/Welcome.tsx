import { useState } from "react"
import { useNavigate } from "react-router-dom";

type WelcomeProps = {
    setUsername: (username: string) => void;
}

export default function Welcome({ setUsername }: WelcomeProps) {
    const navigate = useNavigate();
    const [localUsername, setLocalUsername] = useState<string>("");

    // this is probably dumb
    const handleSolve = () => {
        setUsername(localUsername)
        navigate("/solve");
    }

    return (
        <>
            <label htmlFor="username">Enter your chess.com username:
                <input type="text" value={localUsername} onChange={(e) => setLocalUsername(e.target.value)} />
            </label>

            <button onClick={handleSolve}>
                Solve
            </button>
        </>
    )
}