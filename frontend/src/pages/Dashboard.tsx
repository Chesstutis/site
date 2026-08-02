import { ArrowRight } from "lucide-react";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/components/AuthProvider";
import { buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
    const { status, user } = useAuth();

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
            </section>
        </div>
    );
}
