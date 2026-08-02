import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WelcomeProps = {
	setUsername: (username: string) => void;
};

export default function Start({ setUsername }: WelcomeProps) {
	const navigate = useNavigate();
	const [localUsername, setLocalUsername] = useState<string>("");

	// this is probably dumb
	const handleSolve = (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		setUsername(localUsername.trim());
		navigate("/solve");
	};

	return (
		<div className="flex flex-1 bg-background px-4 py-8 text-foreground">
			<section className="mx-auto flex w-full max-w-md items-center justify-center">
				<Card className="w-full">
					<CardHeader className="text-center">
						<p className="text-sm font-medium uppercase tracking-widest text-primary">
							Chess Puzzle Solver
						</p>
						<CardTitle className="text-3xl sm:text-4xl">
							Enter your chess.com username
						</CardTitle>
						<CardDescription>
							We’ll pull your account details and take you
							straight to the puzzle solver.
						</CardDescription>
					</CardHeader>

					<CardContent>
					<form onSubmit={handleSolve} className="space-y-5">
						<Label htmlFor="username">
							Username
						</Label>
						<Input
							id="username"
							type="text"
							value={localUsername}
							onChange={(e) => setLocalUsername(e.target.value)}
							placeholder="your_username"
							autoComplete="username"
						/>

						<Button
							type="submit"
							className="w-full"
						>
							Solve
						</Button>
					</form>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
