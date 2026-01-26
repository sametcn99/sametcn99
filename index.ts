import { Application } from "./src";

const app = new Application();
app.generate().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
