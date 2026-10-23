import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/components/AuthProvider";
import { getChessComRatingComparison } from "@/api/chesstutis";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChessComRatingComparison } from "@/types/chesstutis";

const ratingTypes = [
    ["bullet", "Bullet"],
    ["blitz", "Blitz"],
    ["rapid", "Rapid"],
    ["daily", "Daily"],
] as const;

function formatRating(rating: number | null) {
    return rating === null ? "—" : rating.toLocaleString();
}

export default function Dashboard() {
    const { status, user, token } = useAuth();
    const [ratingLoad, setRatingLoad] = useState<{
        token: string;
        status: "ready" | "error";
        data?: ChessComRatingComparison;
    } | null>(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        const controller = new AbortController();
        getChessComRatingComparison(token, controller.signal)
            .then((result) => {
                if (cancelled) return;
                setRatingLoad({ token, status: "ready", data: result });
            })
            .catch(() => {
                if (cancelled) return;
                setRatingLoad({ token, status: "error" });
            });
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [token]);

    const currentRatingLoad = ratingLoad?.token === token ? ratingLoad : null;
    const ratingsStatus = currentRatingLoad?.status ?? "loading";
    const ratings = currentRatingLoad?.data ?? null;

    if (status === "initializing") {
        return (
            <div className="flex flex-1 items-center bg-background px-4 py-10 sm:px-6 sm:py-16">
                <Card className="mx-auto w-full max-w-3xl [--card-spacing:--spacing(6)]">
                    <CardHeader>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-64 max-w-full" />
                        <Skeleton className="h-5 w-96 max-w-full" />
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-9 w-32" />
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex flex-1 bg-background px-4 py-10 text-foreground sm:px-6 sm:py-16">
            <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <header className="flex flex-col gap-2">
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Dashboard
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Ready for your next position?
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                        We&apos;ll use your connected Chess.com account to find
                        recent games and turn the critical moments into puzzles.
                    </p>
                </header>

                <Card className="[--card-spacing:--spacing(6)]">
                    <CardHeader>
                        <div
                            className="mb-3 grid size-10 grid-cols-2 overflow-hidden rounded-lg border border-primary/30"
                            aria-hidden="true"
                        >
                            <span className="bg-primary" />
                            <span className="bg-card" />
                            <span className="bg-card" />
                            <span className="bg-primary" />
                        </div>
                        <CardTitle>
                            <h2 className="text-xl">Your training account</h2>
                        </CardTitle>
                        <CardDescription>
                            These details determine which games Chesstutis
                            analyzes.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/40 p-4">
                                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Email
                                </dt>
                                <dd className="truncate font-medium">
                                    {user.email}
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-muted/40 p-4">
                                <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Chess.com username
                                </dt>
                                <dd className="truncate font-medium">
                                    {user.chess_com_username}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>

                    <CardFooter className="flex-wrap justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            Analyze your latest available games.
                        </p>
                        <Link
                            to="/solve"
                            className={buttonVariants({ size: "lg" })}
                        >
                            Find puzzles
                            <ArrowRight data-icon="inline-end" />
                        </Link>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            <h2 className="text-xl">Chess.com rating progress</h2>
                        </CardTitle>
                        <CardDescription>
                            Compare your starting ratings with your current Chess.com ratings. Chess.com data may update with a delay.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {ratingsStatus === "loading" && (
                            <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading ratings">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </div>
                        )}
                        {ratingsStatus === "error" && (
                            <Alert variant="destructive">
                                <AlertTitle>Ratings unavailable</AlertTitle>
                                <AlertDescription>We couldn&apos;t load your Chess.com rating comparison. Try reloading the dashboard.</AlertDescription>
                            </Alert>
                        )}
                        {ratingsStatus === "ready" && ratings?.comparison_status === "account_mismatch" && (
                            <Alert>
                                <AlertTitle>Chess.com account changed</AlertTitle>
                                <AlertDescription>Your saved baseline belongs to a different Chess.com account, so ratings can&apos;t be compared.</AlertDescription>
                            </Alert>
                        )}
                        {ratingsStatus === "ready" && ratings && ratings.comparison_status !== "account_mismatch" && (
                            <>
                                {ratings.comparison_status === "baseline_unavailable" && (
                                    <p className="mb-4 text-sm text-muted-foreground">No starting ratings were captured for this account.</p>
                                )}
                                {ratings.comparison_status === "current_unavailable" && (
                                    <p className="mb-4 text-sm text-muted-foreground">Current ratings are temporarily unavailable from Chess.com.</p>
                                )}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {ratingTypes.map(([key, label]) => {
                                        const baseline = ratings.baseline[key];
                                        const current = ratings.current[key];
                                        const change = baseline === null || current === null ? null : current - baseline;
                                        return (
                                            <div key={key} className="rounded-xl border bg-muted/40 p-4">
                                                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
                                                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                        <dt className="text-xs text-muted-foreground">Baseline</dt>
                                                        <dd className="mt-1 font-medium">{formatRating(baseline)}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-muted-foreground">Current</dt>
                                                        <dd className="mt-1 font-medium">{formatRating(current)}</dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-xs text-muted-foreground">Change</dt>
                                                        <dd className={`mt-1 font-medium ${change === null ? "text-muted-foreground" : change > 0 ? "text-emerald-600" : change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                                            {change === null ? "—" : `${change > 0 ? "+" : ""}${change}`}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        );
                                    })}
                                </div>
                                {ratings.baseline_captured_at && (
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        Starting ratings captured {new Date(ratings.baseline_captured_at).toLocaleDateString()}.
                                    </p>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
