import { useState, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"

const SESSION_USERNAME_KEY = "chess-session-username"

const normalizeUsername = (value: string) => value.trim().toLowerCase()

export default function Welcome() {
    const [username, setUsername] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const cleanUsername = normalizeUsername(username)
        if (!cleanUsername) {
            return
        }

        sessionStorage.setItem(SESSION_USERNAME_KEY, cleanUsername)
        navigate("/dashboard", { replace: true })
    }

    return (
        <main className="relative flex min-h-[calc(100vh-4.5rem)] items-center justify-center overflow-hidden px-4 py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_30%)]" />
            <div className="relative w-full max-w-2xl">
                <Card className="border-border/70 bg-background/85 shadow-2xl shadow-black/5 backdrop-blur">
                    <CardHeader className="space-y-4 text-center">
                        <div className="flex justify-center">
                            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                                Chess session
                            </Badge>
                        </div>
                        <CardTitle className="text-3xl sm:text-4xl">Welcome to your chess home base</CardTitle>
                        <CardDescription className="mx-auto max-w-lg text-base sm:text-lg">
                            Enter your Chess.com username once, and the site will treat it like your account for the rest of this browser session.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
                            <Input
                                id="chessName"
                                type="text"
                                autoComplete="username"
                                placeholder="Your Chess.com username"
                                value={username}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                className="h-11 rounded-xl"
                            />
                            <Button type="submit" className="h-11 rounded-xl px-5 sm:w-auto">
                                Start session
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
