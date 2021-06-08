import multer from "multer";
import multerS3 from "multer-s3";
import aws from "aws-sdk";

const s3 = new aws.S3({
    credentials: {
        accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
},
});

const s3ImageUploader = multerS3({
  s3: s3,
  bucket: "hongtube.1/images",
  acl: "public-read",
});

const s3VideoUploader = multerS3({
    s3: s3,
    bucket: "hongtube.1/videos",
    acl: "public-read",
});

const isHeroku = process.env.NODE_ENV === "production";

export const localMiddleware = (req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.loggedIn);
  res.locals.siteName = "Hongtube";
  res.locals.loggedInUser = req.session.user || {};
  res.locals.isHeroku = isHeroku;
  next();
};

export const protectorMiddleware = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    req.flash("error", "Login First");
    return res.redirect("/login");
  }
};

export const publicOnlyMiddleware = (req, res, next) => {
  if (!req.session.loggedIn) {
    return next();
  } else {
    req.flash("error", "Not Authorized");
    return res.redirect("/");
  }
};


export const avatarUpload = multer({
  dest: "uploads/avatars/",
  limits: {
    fileSize: 3000000,
  },
  storage: isHeroku ? s3ImageUploader : undefined,
});
export const videoUpload = multer({
  dest: "uploads/videos/",
  limits: {
    fileSize: 30000000,
  },
  storage: isHeroku ? s3VideoUploader : undefined,
});
