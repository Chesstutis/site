import {
    changePassword,
    deleteAccount,
    getAccountInfo,
    getPuzzleStats,
    updateChessComUsername,
} from "@/api/chesstutis";
import type { PuzzleStats } from "@/types/chesstutis";
import type { AuthUser } from "@/types/auth";
import { useAuth } from "@/components/AuthProvider";
import { validate_chess_com_username } from "@/lib/validation";
import { useState, useEffect, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import {
    CalendarDays,
    CircleCheck,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "idle" | "error" | "loading";

function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "long",
        timeStyle: "short",
    }).format(date);
}

function getAccountAge(value: string) {
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
    const { token, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<Status>("idle");
    const [accountInfo, setAccountInfo] = useState<AuthUser>();
    const [puzzleStats, setPuzzleStats] = useState<PuzzleStats>();
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
    const [chessComUsername, setChessComUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [isChangingUsername, setIsChangingUsername] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

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

    async function handleDelete(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token || deleteConfirmation !== "DELETE") return;

        try {
            setIsDeleting(true);
            setDeleteError("");
            await deleteAccount(token);
            await logout();
            navigate("/", { replace: true });
        } catch (error) {
            console.error(error);
            setDeleteError("Could not delete your account. Try again.");
            setIsDeleting(false);
        }
    }

    function resetPasswordForm() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
    }

    async function handlePasswordChange(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token) return;

        setPasswordError("");
        setSuccessMessage("");

        if (newPassword.length < 8 || newPassword.length > 128) {
            setPasswordError("Your new password must contain between 8 and 128 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("The new passwords do not match.");
            return;
        }

        try {
            setIsChangingPassword(true);
            await changePassword(token, currentPassword, newPassword);
            setPasswordDialogOpen(false);
            resetPasswordForm();
            await logout();
            navigate("/login", { replace: true });
        } catch (error) {
            setPasswordError(
                error instanceof Error
                    ? error.message
                    : "Could not change your password. Try again.",
            );
        } finally {
            setIsChangingPassword(false);
        }
    }

    async function handleUsernameChange(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token) return;

        const normalizedUsername = chessComUsername.trim();
        setUsernameError("");
        setSuccessMessage("");

        if (!normalizedUsername) {
            setUsernameError("Enter a Chess.com username.");
            return;
        }

        try {
            setIsChangingUsername(true);

            const usernameExists =
                await validate_chess_com_username(normalizedUsername);
            if (!usernameExists) {
                setUsernameError("We could not find that Chess.com username.");
                return;
            }

            const updatedUser = await updateChessComUsername(
                token,
                normalizedUsername,
            );
            setAccountInfo(updatedUser);
            updateUser(updatedUser);
            setUsernameDialogOpen(false);
            setUsernameError("");
            setSuccessMessage("Chess.com username changed.");
        } catch (error) {
            setUsernameError(
                error instanceof Error
                    ? error.message
                    : "Could not verify that Chess.com username. Try again.",
            );
        } finally {
            setIsChangingUsername(false);
        }
    }

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

                {successMessage && (
                    <Alert className="mb-6 border-primary/30 bg-primary/5">
                        <CircleCheck aria-hidden="true" />
                        <AlertTitle>Account updated</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                )}

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
                                <AlertDialog
                                    open={passwordDialogOpen}
                                    onOpenChange={(open) => {
                                        setPasswordDialogOpen(open);
                                        if (open) {
                                            setSuccessMessage("");
                                        } else if (!isChangingPassword) {
                                            resetPasswordForm();
                                        }
                                    }}
                                >
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
                                                Change your password
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Confirm your current password, then
                                                choose a new one with at least 8
                                                characters.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <form
                                            className="grid gap-4"
                                            onSubmit={handlePasswordChange}
                                        >
                                            <div className="grid gap-2">
                                                <Label htmlFor="current-password">
                                                    Current password
                                                </Label>
                                                <Input
                                                    id="current-password"
                                                    name="current_password"
                                                    type="password"
                                                    maxLength={128}
                                                    value={currentPassword}
                                                    onChange={(event) =>
                                                        setCurrentPassword(
                                                            event.target.value,
                                                        )
                                                    }
                                                    autoComplete="current-password"
                                                    autoFocus
                                                    required
                                                    disabled={isChangingPassword}
                                                    aria-invalid={Boolean(passwordError)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="new-password">
                                                    New password
                                                </Label>
                                                <Input
                                                    id="new-password"
                                                    name="new_password"
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(event) =>
                                                        setNewPassword(event.target.value)
                                                    }
                                                    autoComplete="new-password"
                                                    minLength={8}
                                                    maxLength={128}
                                                    required
                                                    disabled={isChangingPassword}
                                                    aria-describedby="new-password-description"
                                                    aria-invalid={Boolean(passwordError)}
                                                />
                                                <p
                                                    id="new-password-description"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Use at least 8 characters.
                                                </p>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="confirm-password">
                                                    Confirm new password
                                                </Label>
                                                <Input
                                                    id="confirm-password"
                                                    name="confirm_password"
                                                    type="password"
                                                    minLength={8}
                                                    maxLength={128}
                                                    value={confirmPassword}
                                                    onChange={(event) =>
                                                        setConfirmPassword(
                                                            event.target.value,
                                                        )
                                                    }
                                                    autoComplete="new-password"
                                                    required
                                                    disabled={isChangingPassword}
                                                    aria-invalid={Boolean(passwordError)}
                                                />
                                            </div>
                                            {passwordError && (
                                                <p
                                                    className="text-sm text-destructive"
                                                    role="alert"
                                                >
                                                    {passwordError}
                                                </p>
                                            )}
                                            <AlertDialogFooter>
                                                <AlertDialogCancel
                                                    disabled={isChangingPassword}
                                                >
                                                    Cancel
                                                </AlertDialogCancel>
                                                <Button
                                                    type="submit"
                                                    disabled={isChangingPassword}
                                                >
                                                    {isChangingPassword
                                                        ? "Changing…"
                                                        : "Change password"}
                                                </Button>
                                            </AlertDialogFooter>
                                        </form>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog
                                    open={usernameDialogOpen}
                                    onOpenChange={(open) => {
                                        setUsernameDialogOpen(open);
                                        if (open) {
                                            setSuccessMessage("");
                                            setChessComUsername(
                                                accountInfo.chess_com_username,
                                            );
                                        } else if (!isChangingUsername) {
                                            setUsernameError("");
                                        }
                                    }}
                                >
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
                                                Change your Chess.com username
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                We will verify the account with
                                                Chess.com before saving it.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <form
                                            className="grid gap-4"
                                            onSubmit={handleUsernameChange}
                                        >
                                            <div className="grid gap-2">
                                                <Label htmlFor="chess-com-username">
                                                    Chess.com username
                                                </Label>
                                                <Input
                                                    id="chess-com-username"
                                                    name="chess_com_username"
                                                    type="text"
                                                    minLength={3}
                                                    maxLength={100}
                                                    pattern="[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?"
                                                    value={chessComUsername}
                                                    onChange={(event) =>
                                                        setChessComUsername(
                                                            event.target.value,
                                                        )
                                                    }
                                                    autoComplete="username"
                                                    autoFocus
                                                    required
                                                    disabled={isChangingUsername}
                                                    aria-invalid={Boolean(usernameError)}
                                                />
                                                {usernameError && (
                                                    <p
                                                        className="text-sm text-destructive"
                                                        role="alert"
                                                    >
                                                        {usernameError}
                                                    </p>
                                                )}
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel
                                                    disabled={isChangingUsername}
                                                >
                                                    Cancel
                                                </AlertDialogCancel>
                                                <Button
                                                    type="submit"
                                                    disabled={isChangingUsername}
                                                >
                                                    {isChangingUsername
                                                        ? "Verifying…"
                                                        : "Change username"}
                                                </Button>
                                            </AlertDialogFooter>
                                        </form>
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
                                <AlertDialog
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setDeleteConfirmation("");
                                            setDeleteError("");
                                        }
                                    }}
                                >
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
                                                This permanently removes your account
                                                and training data. This action cannot
                                                be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <form
                                            className="grid gap-4"
                                            onSubmit={handleDelete}
                                        >
                                            <div className="grid gap-2">
                                                <Label htmlFor="delete-confirmation">
                                                    Type DELETE to confirm
                                                </Label>
                                                <Input
                                                    id="delete-confirmation"
                                                    name="delete-confirmation"
                                                    value={deleteConfirmation}
                                                    onChange={(event) =>
                                                        setDeleteConfirmation(
                                                            event.target.value,
                                                        )
                                                    }
                                                    autoComplete="off"
                                                    autoFocus
                                                    disabled={isDeleting}
                                                    aria-invalid={Boolean(deleteError)}
                                                />
                                                {deleteError && (
                                                    <p
                                                        className="text-sm text-destructive"
                                                        role="alert"
                                                    >
                                                        {deleteError}
                                                    </p>
                                                )}
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel
                                                    disabled={isDeleting}
                                                >
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    type="submit"
                                                    variant="destructive"
                                                    disabled={
                                                        deleteConfirmation !==
                                                            "DELETE" || isDeleting
                                                    }
                                                >
                                                    {isDeleting
                                                        ? "Deleting…"
                                                        : "Delete account"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </form>
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
