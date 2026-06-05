import { useState } from "react"
import { useNavigate } from "react-router-dom";

type WelcomeProps = {
    setUsername: (username: string) => void;
}

export default function Welcome({ setUsername }: WelcomeProps) {
    const navigate = useNavigate();
    const [localUsername, setLocalUsername] = useState<string>("");

    // this is probably dumb
    const handleSolve = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUsername(localUsername.trim())
        navigate("/solve");
    }

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
            <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
                <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
                    <div className="mb-8 text-center">
                        <p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-300/80">
                            Chess Puzzle Solver
                        </p>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Enter your chess.com username
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                            We’ll pull your account details and take you straight to the puzzle solver.
                        </p>
                    </div>

                    <form onSubmit={handleSolve} className="space-y-5">
                        <label htmlFor="username" className="block text-sm font-medium text-slate-200">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={localUsername}
                            onChange={(e) => setLocalUsername(e.target.value)}
                            placeholder="your_username"
                            autoComplete="username"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20"
                        />

                        <button
                            type="submit"
                            className="flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
                        >
                            Solve
                        </button>
                    </form>
                </div>
            </section>
        </main>
    )
}