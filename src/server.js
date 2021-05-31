import express from "express";
import morgan from "morgan";
import session from "express-session";
import flash from "express-flash";
import MongoStore from "connect-mongo";
import rootRouter from "./routers/rootRouter";
import userRouter from "./routers/userRouter";
import videoRouter from "./routers/videoRouter";
import { localMiddleware } from "./middlewares";
import apiRouter from "./routers/apiRouter";

const app = express();
const logger = morgan("dev");

// view engine 으로 pug 사용
app.set("view engine", "pug");
// views 기본 폴더 변경
app.set("views", process.cwd() + "/src/views");
// morgan("dev") 사용. 웹사이트 이용 시 console 에 정보 표기
app.use(logger);
// post 된 정보를 처리하기 위한 middleware
app.use(
  express.urlencoded({
    extended: true,
  })
);

// session에 접근하기 위한 session middleware
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    // session 이 수정되지 않아도 새로 저장하는 옵션.
    resave: false,
    // uninitialized session(수정된 적 없는 세션)을 저장하는 옵션. false: 세션을 수정하기 전(로그인 전)에는 세션이 생성되지 않음.
    saveUninitialized: false,
    // cookie: {
    //     // cookie's maxAge in miliseconds, 20000 = 20 seconds
    //     maxAge: 20000,
    // },
    // mongodb 에 session 을 저장할 수 있는 장소 생성
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
    }),
  })
);
// session 정보를 바탕으로 locals에 전달하기 위한 local middleware. local middleware가 뒤에 와야한다. 순서 중요.
app.use(localMiddleware);

// flash 사용
app.use(flash());

// uploads 폴더를 브라우저에 노출시킴.
app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("assets"));
app.use("/", rootRouter);
app.use("/videos", videoRouter);
app.use("/users", userRouter);
app.use("/api", apiRouter);

export default app;
