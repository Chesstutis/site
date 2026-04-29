
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
    FaBullseye,
    FaCircle,
    FaChessKnight,
    FaCrown,
    FaGlobe,
    FaLongArrowAltDown,
    FaLongArrowAltUp,
    FaStopwatch,
    FaSun,
    FaTrophy,
    FaUser,
    FaUserFriends,
} from "react-icons/fa"
import { GiBulletBill } from "react-icons/gi"
import { HiMiniBolt } from "react-icons/hi2"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"

const SESSION_USERNAME_KEY = "chess-session-username"

type ChessRecord = {
    win?: number
    loss?: number
    draw?: number
}

type ChessModeStats = {
    last?: { rating?: number; date?: number }
    best?: { rating?: number; date?: number; game?: string }
    record?: ChessRecord
}

type ChessStats = {
    chess_rapid?: ChessModeStats
    chess_blitz?: ChessModeStats
    chess_bullet?: ChessModeStats
    chess_daily?: ChessModeStats
    tactics?: {
        highest?: { rating?: number; date?: number }
        lowest?: { rating?: number; date?: number }
    }
    puzzle_rush?: {
        best?: { score?: number; total_attempts?: number }
    }
}

type PlayerProfile = {
    username: string
    name?: string
    avatar?: string
    title?: string
    followers?: number
    country?: string
    url?: string
    joined?: number
    last_online?: number
    status?: string
}

type ArchiveResponse = {
    archives?: string[]
}

type ArchivePlayer = {
    username?: string
    result?: string
    rating?: number
}

type ArchiveGame = {
    url?: string
    end_time?: number
    rated?: boolean
    time_class?: string
    time_control?: string
    white?: ArchivePlayer
    black?: ArchivePlayer
}

type MonthlyArchiveResponse = {
    games?: ArchiveGame[]
}

type RecentGame = {
    id: string
    playedAt?: number
    result: string
    timeClass: string
    timeControl: string
    rated: boolean
    whitePlayer: string
    blackPlayer: string
    playerRating: number | null
    whiteRating: number | null
    blackRating: number | null
    opponentRating: number | null
}

const formatDate = (unix?: number) => {
    if (!unix) return "-"
    return new Date(unix * 1000).toLocaleDateString()
}

const countryCodeFromUrl = (countryUrl?: string) => {
    if (!countryUrl) return "-"
    const code = countryUrl.split("/").pop()
    return code || "-"
}

const normalizeUsername = (value?: string) => value?.trim().toLowerCase() ?? ""

const toRecentGame = (game: ArchiveGame, targetUsername: string): RecentGame | null => {
    const whiteName = normalizeUsername(game.white?.username)
    const blackName = normalizeUsername(game.black?.username)
    const cleanTarget = normalizeUsername(targetUsername)

    const playerColor = whiteName === cleanTarget ? "white" : blackName === cleanTarget ? "black" : null
    if (!playerColor) return null

    const player = playerColor === "white" ? game.white : game.black
    const opponent = playerColor === "white" ? game.black : game.white
    const rawResult = player?.result ?? "unknown"

    return {
        id: game.url || `${game.end_time ?? 0}-${rawResult}`,
        playedAt: game.end_time,
        result: rawResult,
        timeClass: game.time_class ?? "-",
        timeControl: game.time_control ?? "-",
        rated: Boolean(game.rated),
        whitePlayer: game.white?.username ?? "White",
        blackPlayer: game.black?.username ?? "Black",
        playerRating: typeof player?.rating === "number" ? player.rating : null,
        whiteRating: typeof game.white?.rating === "number" ? game.white.rating : null,
        blackRating: typeof game.black?.rating === "number" ? game.black.rating : null,
        opponentRating: typeof opponent?.rating === "number" ? opponent.rating : null,
    }
}

const timeClassIcon = (timeClass?: string) => {
    switch (timeClass) {
        case "rapid":
            return <FaStopwatch className="text-sky-600" aria-hidden="true" />
        case "blitz":
            return <HiMiniBolt className="text-amber-500" aria-hidden="true" />
        case "bullet":
            return <GiBulletBill className="text-slate-700" aria-hidden="true" />
        case "daily":
            return <FaSun className="text-orange-500" aria-hidden="true" />
        default:
            return <FaChessKnight className="text-primary" aria-hidden="true" />
    }
}

const resultIcon = (result: string) => {
    if (result === "win") {
        return <FaLongArrowAltUp className="text-emerald-600" aria-hidden="true" />
    }
    if (["agreed", "repetition", "stalemate", "timevsinsufficient", "insufficient", "50move", "draw"].includes(result)) {
        return <FaCircle className="text-muted-foreground" aria-hidden="true" size={10} />
    }
    return <FaLongArrowAltDown className="text-rose-600" aria-hidden="true" />
}

type StatCardProps = {
    label: string
    stats?: ChessModeStats
    icon: React.ReactNode
}

function StatCard({ label, stats, icon }: StatCardProps) {
    return (
        <Card size="sm" className="bg-linear-to-br from-card to-muted/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p>
                    Current: <span className="font-medium">{stats?.last?.rating ?? "-"}</span>
                </p>
                <p>
                    Best: <span className="font-medium">{stats?.best?.rating ?? "-"}</span>
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                    <div className="rounded-md bg-emerald-500/12 px-2 py-1 text-emerald-700 ring-1 ring-emerald-500/30">
                        W {stats?.record?.win ?? 0}
                    </div>
                    <div className="rounded-md bg-rose-500/12 px-2 py-1 text-rose-700 ring-1 ring-rose-500/30">
                        L {stats?.record?.loss ?? 0}
                    </div>
                    <div className="rounded-md bg-muted px-2 py-1 text-muted-foreground ring-1 ring-border">
                        D {stats?.record?.draw ?? 0}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function Dashboard() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [username] = useState(() => {
        const storedUsername = sessionStorage.getItem(SESSION_USERNAME_KEY)?.trim().toLowerCase() ?? ""
        if (storedUsername) {
            return storedUsername
        }

        return searchParams.get("username")?.trim().toLowerCase() ?? ""
    })
    const [profile, setProfile] = useState<PlayerProfile | null>(null)
    const [stats, setStats] = useState<ChessStats | null>(null)
    const [recentGames, setRecentGames] = useState<RecentGame[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisMessage, setAnalysisMessage] = useState("")

    const fetchPlayerData = useCallback(async (rawUsername: string) => {
        const cleanUsername = rawUsername.trim().toLowerCase()
        if (!cleanUsername) {
            return
        }

        setLoading(true)
        setError("")

        try {
            const [profileRes, statsRes, archivesRes] = await Promise.all([
                fetch(`https://api.chess.com/pub/player/${cleanUsername}`),
                fetch(`https://api.chess.com/pub/player/${cleanUsername}/stats`),
                fetch(`https://api.chess.com/pub/player/${cleanUsername}/games/archives`),
            ])

            if (!profileRes.ok) {
                throw new Error("Could not fetch player profile. Check the username.")
            }

            if (!statsRes.ok) {
                throw new Error("Could not fetch player stats.")
            }

            if (!archivesRes.ok) {
                throw new Error("Could not fetch player game archives.")
            }

            const [profileData, statsData, archivesData] = (await Promise.all([
                profileRes.json(),
                statsRes.json(),
                archivesRes.json(),
            ])) as [PlayerProfile, ChessStats, ArchiveResponse]

            const archiveUrls = archivesData.archives ?? []
            const latestArchiveUrls = archiveUrls.slice(-2)
            const monthlyGamesResponses = await Promise.all(
                latestArchiveUrls.map(async (archiveUrl) => {
                    const monthlyRes = await fetch(archiveUrl)
                    if (!monthlyRes.ok) return [] as ArchiveGame[]
                    const monthlyData = (await monthlyRes.json()) as MonthlyArchiveResponse
                    return monthlyData.games ?? []
                })
            )

            const topRecentGames = monthlyGamesResponses
                .flat()
                .map((game) => toRecentGame(game, cleanUsername))
                .filter((game): game is RecentGame => game !== null)
                .sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0))
                .slice(0, 10)

            setProfile(profileData)
            setStats(statsData)
            setRecentGames(topRecentGames)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown request error."
            setError(message)
            setProfile(null)
            setStats(null)
            setRecentGames([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!username) {
            navigate("/", { replace: true })
            return
        }

        sessionStorage.setItem(SESSION_USERNAME_KEY, username)
        void fetchPlayerData(username)
    }, [fetchPlayerData, navigate, username])

    const handleAnalyzeGames = async () => {
        if (!username) {
            setAnalysisMessage("Set a username first.")
            return
        }

        setAnalysisLoading(true)
        setAnalysisMessage("")

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username }),
            })

            const message = await response.text()

            if (!response.ok) {
                throw new Error(message || "Could not request game analysis.")
            }

            setAnalysisMessage(message || "Analysis request sent.")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown request error."
            setAnalysisMessage(message)
        } finally {
            setAnalysisLoading(false)
        }
    }

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6">
            <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-background to-background">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FaChessKnight className="text-primary" aria-hidden="true" />
                        Chess.com Dashboard
                    </CardTitle>
                    <CardDescription>
                        Signed in as <span className="font-medium text-foreground">{username}</span>. Your session keeps this account until you change it from the welcome screen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        If you want to switch accounts, go back to the welcome page and start a new session.
                    </p>
                    <Button type="button" variant="secondary" onClick={() => navigate("/")}>Change username</Button>
                    {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
                </CardContent>
            </Card>

            {loading && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl md:col-span-2" />
                </div>
            )}

            {!loading && profile && stats && (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {profile.title && <Badge variant="secondary">{profile.title}</Badge>}
                                            <FaUser className="text-primary" aria-hidden="true" />
                                            <span>{profile.username}</span>
                                        </CardTitle>
                                        <CardDescription>{profile.name || "No real name listed"}</CardDescription>
                                    </div>
                                    {profile.avatar ? (
                                        <img
                                            src={profile.avatar}
                                            alt={`${profile.username} avatar`}
                                            className="h-14 w-14 rounded-full object-cover ring-1 ring-border"
                                        />
                                    ) : null}
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3 text-sm">
                                <p className="flex items-center gap-2">
                                    <FaUserFriends className="text-primary" aria-hidden="true" />
                                    Followers: <span className="font-medium">{profile.followers ?? 0}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <FaGlobe className="text-primary" aria-hidden="true" />
                                    Country: <span className="font-medium">{countryCodeFromUrl(profile.country)}</span>
                                </p>
                                <p>
                                    Joined: <span className="font-medium">{formatDate(profile.joined)}</span>
                                </p>
                                <p>
                                    Last Online: <span className="font-medium">{formatDate(profile.last_online)}</span>
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FaTrophy className="text-amber-500" aria-hidden="true" />
                                    Puzzle Stats
                                </CardTitle>
                                <CardDescription>Tactics and puzzle rush highlights.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p className="flex items-center gap-2">
                                    <FaLongArrowAltUp className="text-emerald-600" aria-hidden="true" />
                                    Tactics Highest: <span className="font-medium">{stats.tactics?.highest?.rating ?? "-"}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <FaLongArrowAltDown className="text-rose-600" aria-hidden="true" />
                                    Tactics Lowest: <span className="font-medium">{stats.tactics?.lowest?.rating ?? "-"}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <FaCrown className="text-amber-500" aria-hidden="true" />
                                    Puzzle Rush Best: <span className="font-medium">{stats.puzzle_rush?.best?.score ?? "-"}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <FaBullseye className="text-slate-500" aria-hidden="true" />
                                    Total Attempts: <span className="font-medium">{stats.puzzle_rush?.best?.total_attempts ?? "-"}</span>
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Rapid"
                            stats={stats.chess_rapid}
                            icon={<FaStopwatch className="text-sky-600" aria-hidden="true" />}
                        />
                        <StatCard
                            label="Blitz"
                            stats={stats.chess_blitz}
                            icon={<HiMiniBolt className="text-amber-500" aria-hidden="true" />}
                        />
                        <StatCard
                            label="Bullet"
                            stats={stats.chess_bullet}
                            icon={<GiBulletBill className="text-slate-700" aria-hidden="true" />}
                        />
                        <StatCard
                            label="Daily"
                            stats={stats.chess_daily}
                            icon={<FaSun className="text-orange-500" aria-hidden="true" />}
                        />
                    </section>

                    <Card>
                        <CardHeader className="relative gap-3 pr-36">
                            <div>
                                <CardTitle>Recent Games</CardTitle>
                                <CardDescription>Latest games from Chess.com monthly archives.</CardDescription>
                            </div>
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                <Button type="button" variant="secondary" onClick={handleAnalyzeGames} disabled={analysisLoading || loading}>
                                    {analysisLoading ? "Analyzing..." : "Learn from your mistakes"}
                                </Button>
                                {analysisMessage ? (
                                    <p className="max-w-xs text-right text-xs text-muted-foreground sm:text-sm">
                                        {analysisMessage}
                                    </p>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {recentGames.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent games found in the latest archives.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {recentGames.map((game) => (
                                        <li
                                            key={game.id}
                                            className="flex flex-col gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center">{resultIcon(game.result)}</span>
                                                <span className="font-medium">
                                                    {game.whitePlayer} vs {game.blackPlayer}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center">{timeClassIcon(game.timeClass)}</span>
                                                {/* <span>{game.timeControl}</span> */}
                                                <span>{game.rated ? "Rated" : "Unrated"}</span>
                                                <span>
                                                    {game.whiteRating ?? "-"} - {game.blackRating ?? "-"}
                                                </span>
                                                <span>{formatDate(game.playedAt)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </main>
    )
}