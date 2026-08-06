import { getAccountInfo, getPuzzleStats } from "@/api/chesstutis";
import type { PuzzleStats, User } from "@/types/chesstutis";
import { useAuth } from "@/components/AuthProvider";
import { useState, useEffect } from "react";
import {
    CalendarDays,
    Clock3,
    Hash,
    KeyRound,
    Mail,
    Puzzle,
    ShieldAlert,
    Trash2,
    UserRoundPen,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "idle" | "error" | "loading";

function formatDate(value: Date) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "long",
        timeStyle: "short",
    }).format(date);
}

function getAccountAge(value: Date) {
    const createdAt = new Date(value);

    if (Number.isNaN(createdAt.getTime())) return "Unknown";

    const days = Math.max(
        0,
        Math.floor((Date.now() - createdAt.getTime()) / 86_400_000),
    );

    if (days < 1) return "Less than a day";
    if (days < 30) return `${days} ${days === 1 ? "day" : "days"}`;

    const months = Math.floor(days / 30);
    if (months < 12) {
        return `${months} ${months === 1 ? "month" : "months"}`;
    }

    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);

    return remainingMonths > 0
        ? `${years}y ${remainingMonths}m`
        : `${years} ${years === 1 ? "year" : "years"}`;
}

export default function Account() {
    const { token } = useAuth();
    const [status, setStatus] = useState<Status>("idle");
    const [accountInfo, setAccountInfo] = useState<User>();
    const [puzzleStats, setPuzzleStats] = useState<PuzzleStats>();

    useEffect(() => {
        if (!token) {
            setStatus("idle");
            return;
        }

        async function getData() {
            try {
                setStatus("loading");
                const [accountData, statsData] = await Promise.all([
                    getAccountInfo(token!),
                    getPuzzleStats(token!),
                ]);
                setAccountInfo(accountData);
                setPuzzleStats(statsData);
                setStatus("idle");
            } catch (error) {
                console.error(error);
                setStatus("error");
            }
        }
        getData();
    }, [token]);

    if (status === "loading") {
        return (
            <div className="flex flex-1 bg-background px-4 py-10 sm:px-6">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-10 w-64 max-w-full" />
                    </div>
                    <Skeleton className="h-56 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex flex-1 items-center bg-background px-4 py-10 sm:px-6">
                <Alert variant="destructive" className="mx-auto max-w-xl">
                    <AlertTitle>Could not load your account</AlertTitle>
                    <AlertDescription>
                        Refresh the page and try again.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!accountInfo || !puzzleStats) return null;

    const accountDetails = [
        {
            label: "Email address",
            value: accountInfo.email,
            icon: Mail,
        },
        {
            label: "Chess.com username",
            value: accountInfo.chess_com_username || "Not connected",
            icon: UserRoundPen,
        },
        {
            label: "Account ID",
            value: `#${accountInfo.id}`,
            icon: Hash,
        },
        {
            label: "Member since",
            value: formatDate(accountInfo.created_at),
            icon: CalendarDays,
        },
        {
            label: "Last updated",
            value: formatDate(accountInfo.updated_at),
            icon: Clock3,
        },
    ];

    return (
        <div className="flex flex-1 bg-background px-4 py-10 text-foreground sm:px-6 sm:py-14">
            <div className="mx-auto w-full max-w-4xl">
                <header className="mb-8 max-w-2xl">
                    <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-primary">
                        Your account
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Account settings
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        Review your account details and manage how you sign in.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle>Player record</CardTitle>
                                <CardDescription>
                                    The information associated with your account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <dl className="divide-y divide-border">
                                    {accountDetails.map((detail) => {
                                        const Icon = detail.icon;

                                        return (
                                            <div
                                                key={detail.label}
                                                className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"
                                            >
                                                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Icon
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    {detail.label}
                                                </dt>
                                                <dd className="wrap-break-word font-medium sm:text-right">
                                                    {detail.value}
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle>Account controls</CardTitle>
                                <CardDescription>
                                    Update your sign-in details or connected chess identity.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3 sm:grid-cols-2">
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="lg"
                                                className="justify-start"
                                            />
                                        }
                                    >
                                        <KeyRound
                                            data-icon="inline-start"
                                            aria-hidden="true"
                                        />
                                        Change password
                                    </AlertDialogTrigger>
                                    <AlertDialogContent size="sm">
                                        <AlertDialogHeader>
                                            <AlertDialogMedia>
                                                <KeyRound aria-hidden="true" />
                                            </AlertDialogMedia>
                                            <AlertDialogTitle>
                                                Change your password?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Password changes are not available
                                                yet. This dialog is ready for the
                                                future account flow.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction disabled>
                                                Change password
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="lg"
                                                className="justify-start"
                                            />
                                        }
                                    >
                                        <UserRoundPen
                                            data-icon="inline-start"
                                            aria-hidden="true"
                                        />
                                        Change Chess.com username
                                    </AlertDialogTrigger>
                                    <AlertDialogContent size="sm">
                                        <AlertDialogHeader>
                                            <AlertDialogMedia>
                                                <UserRoundPen aria-hidden="true" />
                                            </AlertDialogMedia>
                                            <AlertDialogTitle>
                                                Change your Chess.com username?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Username changes are not available
                                                yet. This dialog is ready for the
                                                future account flow.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction disabled>
                                                Change username
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>

                        <Card className="ring-destructive/25">
                            <CardHeader className="border-b border-destructive/15">
                                <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-destructive/10 p-2 text-destructive">
                                        <ShieldAlert
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <CardTitle>Danger zone</CardTitle>
                                        <CardDescription className="mt-1">
                                            Deleting your account permanently removes your data.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                type="button"
                                                variant="destructive"
                                            />
                                        }
                                    >
                                        <Trash2
                                            data-icon="inline-start"
                                            aria-hidden="true"
                                        />
                                        Delete account
                                    </AlertDialogTrigger>
                                    <AlertDialogContent size="sm">
                                        <AlertDialogHeader>
                                            <AlertDialogMedia>
                                                <Trash2 aria-hidden="true" />
                                            </AlertDialogMedia>
                                            <AlertDialogTitle>
                                                Delete your account?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Account deletion is not available
                                                yet. When enabled, this will
                                                permanently remove your account and
                                                training data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                variant="destructive"
                                                disabled
                                            >
                                                Delete account
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </div>

                    <aside className="flex flex-col gap-6 lg:order-last">
                        <Card className="overflow-hidden bg-primary text-primary-foreground ring-primary">
                            <CardContent className="relative py-2">
                                <span
                                    className="absolute -right-8 -top-12 text-[10rem] leading-none text-primary-foreground/10"
                                    aria-hidden="true"
                                >
                                    ♞
                                </span>
                                <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
                                    Time on the board
                                </p>
                                <p className="relative mt-3 text-3xl font-semibold tracking-tight">
                                    {getAccountAge(accountInfo.created_at)}
                                </p>
                                <p className="relative mt-2 text-sm text-primary-foreground/75">
                                    since you joined Chesstutis
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden">
                            <CardContent className="relative py-2">
                                <Puzzle
                                    className="absolute -right-5 -top-5 size-28 rotate-12 text-primary/10"
                                    aria-hidden="true"
                                />
                                <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Training progress
                                </p>
                                <p className="relative mt-3 text-4xl font-semibold tracking-tight text-primary">
                                    {puzzleStats.solved.toLocaleString()}
                                </p>
                                <p className="relative mt-2 text-sm text-muted-foreground">
                                    puzzles solved
                                </p>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </div>
    );
}
