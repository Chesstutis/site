import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
	const navigate = useNavigate();

    return (
		<div className="flex flex-1 bg-background px-4 py-8 text-foreground">
			<section className="mx-auto flex w-full max-w-md items-center justify-center">
				<Card className="w-full">
					<CardHeader className="text-center">
						<p className="text-sm font-medium uppercase tracking-widest text-primary">
							Chess Puzzle Solver
						</p>
						<CardTitle className="text-3xl sm:text-4xl">
							Page not found
						</CardTitle>
						<CardDescription>
							The page you requested does not exist.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							type="button"
							className="w-full"
							onClick={() => navigate("/")}
						>
							Go home
						</Button>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
