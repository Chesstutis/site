import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom"

export default function Welcome() {
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const cleanUsername = username.trim().toLowerCase();
        if (!cleanUsername) {
            return;
        }

        try {
            const res = await fetch(`https://api.chess.com/pub/player/${cleanUsername}`);
            const data = await res.json();
            console.log(data)
            navigate(`/dashboard?username=${cleanUsername}`)
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="h-screen flex flex-col items-center justify-center gap-2">
            <label htmlFor="chessName" className="text-md font-bold">Enter your chess.com username:</label>
            <input 
                id="chessName"
                type="text" 
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Search</button>
        </form>
    )
}
