import "regenerator-runtime";
import "dotenv/config";
import "./db";
import "./models/Video";
import "./models/User";
import "./models/Comment";
import app from "./server";

// Website Address: https://lively-darkness-2528.fly.dev/

const PORT = process.env.PORT;

const handleListening = () =>
    console.log(`Server Listening on port http://localhost:${PORT}`);

app.listen(PORT, handleListening);