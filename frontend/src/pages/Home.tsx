import { useState } from "react";


export default function Home() {
    const [username, setUsername] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(`https://api.chess.com/pub/player/${username}`);
            const data = await res.json();
            console.log(data)
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="h-screen flex flex-col items-center justify-center gap-2">
            <label htmlFor="chessName" className="text-md font-medium font-bold">Enter your chess.com username:</label>
            <input 
                type="text" 
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={username}
                onChange={ (e) => setUsername(e.target.value) }
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Search</button>
        </form>
    )
}
