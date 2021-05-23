import "dotenv/config";
import "./db";
import "./models/video";
import "./models/user";
import app from "./server";

const PORT = 4000;

const handleListening = () => 
    console.log(`Server listening on port http://localhost:${PORT}`);

app.listen(4000, handleListening);