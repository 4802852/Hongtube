import express from "express";
import { trending, search } from "../controllers/videoController";
import { join, login } from "../controllers/userContoller";

const globalRouter = express.Router();

globalRouter.get("/", trending);
globalRouter.get("/join", join);
globalRouter.get("/login", login);

export default globalRouter;
