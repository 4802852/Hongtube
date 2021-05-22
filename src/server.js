
import express from "express";
import morgan from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo";
import rootRouter from "./routers/rootRouter";
import userRouter from "./routers/userRouter";
import videoRouter from "./routers/videoRouter";
import { localMiddleware } from "./middlewares";


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

// session에 접근하기 위한 session middleware
app.use(session({
    secret: "Hello!",
    resave: true,
    saveUninitialized: true,
    // mongodb 에 session 을 저장할 수 있는 장소 생성
    store: MongoStore.create({ mongoUrl: "mongodb://127.0.0.1:27017/hongtube" }),
}));
// session 정보를 바탕으로 locals에 전달하기 위한 local middleware. local middleware가 뒤에 와야한다. 순서 중요.
app.use(localMiddleware);

app.use("/", rootRouter);
app.use("/videos", videoRouter);
app.use("/users", userRouter);

export default app;