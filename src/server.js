
import express from "express";
import morgan from "morgan";
import globalRouter from "./routers/globalRouter";
import userRouter from "./routers/userRouter";
import videoRouter from "./routers/videoRouter";


const app = express();
const logger = morgan("dev");

// view engine 으로 pug 사용
app.set("view engine", "pug");
// views 기본 폴더 변경
app.set("views", process.cwd() + "/src/views");
// morgan("dev") 사용. 웹사이트 이용 시 console 에 정보 표기
app.use(logger);
// post 된 정보를 처리하기 위한 middleware
app.use(express.urlencoded({ extended: true }));
app.use("/", globalRouter);
app.use("/videos", videoRouter);
app.use("/users", userRouter);

export default app;