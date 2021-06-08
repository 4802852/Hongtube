import User from "../models/user";
import Comment from "../models/comment";
import Video from "../models/video";

export const home = async (req, res) => {
  // callback ë°©ë²•
  // Video.find({}, (error, videos) => {
  //     return res.render("home", { pageTitle: "Home", videos });
  // });
  // promising ë°©ë²• : await async ì¶”ê??
  const videos = await Video.find({})
    .sort({
      createdAt: "desc",
    })
    .populate("owner");
  return res.render("home", {
    pageTitle: "Home",
    videos,
  });
};
export const watch = async (req, res) => {
  // const id = req.params.id;
  const { id } = req.params;
  // populate ?Š” Video ëª¨ë¸?— ?—°ê²°ëœ Objectë¥? ?™?‹œ?— ë¶ˆëŸ¬???ì¤??‹¤.
  // mongooseê°? Video ?•ˆ?˜ owner ê°? User Object?˜ id ?¸ ê²ƒì„ ?•Œê³? ?•´?‹¹ Object ë¥? owner?— ë¶ˆëŸ¬???ì¤??‹¤.
  const video = await Video.findById(id).populate("owner").populate("comment");
  if (!video) {
    return res.status(404).render("404", {
      pageTitle: "Video not found.",
    });
  }
  return res.render("watch", {
    pageTitle: video.title,
    video,
  });
};

export const getEdit = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).render("404", {
      pageTitle: "Video not found.",
    });
  }
  // video ?˜ owner ??? ?˜„?ž¬ ë¡œê·¸?¸?•œ user ë¥? ë¹„êµ?•˜?—¬ ?ˆ˜? •?•  ?ˆ˜ ?žˆ?Š” ê¶Œí•œ?„ ?™•?¸?•´ì¤?
  if (String(video.owner) !== String(req.session.user._id)) {
    req.flash("error", "You are not owner of the video.");
    return res.status(403).redirect("/");
  }
  return res.render("edit", {
    pageTitle: `Edit: ${video.title}`,
    video,
  });
};
export const postEdit = async (req, res) => {
  const { id } = req.params;
  const { title, description, hashtags } = req.body;
  // const video = await Video.findById(id);
  const video = await Video.exists({
    _id: id,
  });
  if (!video) {
    return res.status(404).render("404", {
      pageTitle: "Video not found.",
    });
  }
  if (String(video.owner) !== String(req.session.user._id)) {
    return res.status(403).redirect("/");
  }
  // video.title = title;
  // video.description = description;
  // video.hashtags = hashtags.split(",").map((word) => (word.startsWith("#") ? word : `#${word}`));
  // await video.save();
  await Video.findByIdAndUpdate(id, {
    title,
    description,
    hashtags: Video.formatHashtags(hashtags),
  });
  req.flash("success", "Change saved.");
  return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
  return res.render("upload", {
    pageTitle: `Upload Video`,
  });
};
export const postUpload = async (req, res) => {
  // const file = req.file;
  // const user = req.session;
  // const { title, description, hashtags } = req.body;
  const {
    session: {
      user: { _id },
    },
    body: { title, description, hashtags },
    files: { video, thumb },
  } = req;
  const isHeroku = process.env.NODE_ENV === "production";
  try {
    const newVideo = await Video.create({
      title: title,
      description: description,
      fileUrl: isHeroku ? video[0].location : video[0].path,
      thumbUrl: isHeroku ? thumb[0].location : thumb[0].path,
      owner: _id,
      // createdAt: Date.now(),
      // default date ì§?? •?„ ?†µ?•´ ?‚­? œ ê°??Š¥
      hashtags: Video.formatHashtags(hashtags),
    });
    // User ?˜ Videos Array ?— ?ƒˆë¡? ?“±ë¡í•˜?Š” video ?˜ id ë¥? ì¶”ê???•´ì¤?
    const user = await User.findById(_id);
    user.videos.push(newVideo._id);
    user.save();
    req.flash("success", "Video uploaded.");
    return res.redirect("/");
  } catch (error) {
    return res.status(400).render("upload", {
      pageTitle: `Upload Video`,
      errorMessage: error._message,
    });
  }
};

export const deleteVideo = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.status(404).render("404", {
      pageTitle: "Video not found.",
    });
  }
  if (String(video.owner) !== String(req.session.user._id)) {
    return res.status(403).redirect("/");
  }
  await Video.findByIdAndDelete(id);
  req.flash("success", "Change deleted.");
  return res.redirect("/");
};

export const search = async (req, res) => {
  const { keyword } = req.query;
  let videos = [];
  if (keyword) {
    // search
    videos = await Video.find({
      title: {
        $regex: new RegExp(keyword, "i"),
      },
    }).populate("owner");
  }
  return res.render("search", {
    pageTitle: "Search",
    videos,
  });
};

export const registerView = async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) {
    return res.sendStatus(404);
  }
  video.meta.views = video.meta.views + 1;
  await video.save();
  return res.sendStatus(200);
};

export const createComment = async (req, res) => {
  const {
    params: { id },
    body: { text },
    session: { user },
  } = req;
  const video = await Video.findById(id);
  if (!video) {
    return res.sendStatus(404);
  }
  const comment = await Comment.create({
    text,
    owner: user._id,
    video: id,
  });
  video.comment.push(comment._id);
  video.save();
  const userObj = await User.findById(user._id);
  userObj.comment.push(comment._id);
  userObj.save();
  res.status(201).json({ newCommentId: comment._id });
};

export const deleteComment = async (req, res) => {
  const {
    params: { id },
    session: { user },
  } = req;
  console.log(req.params);
  const comment = await Comment.findById(id);
  if (!comment) {
    return res.sendStatus(404);
  }
  if (String(comment.owner) !== String(user._id)) {
    return res.sendStatus(403);
  }
  await Comment.findByIdAndDelete(id);
  const video = await Video.findById(comment.video);
  video.comment.pull(comment);
  video.save();
  const userObj = await User.findById(comment.owner);
  userObj.comment.pull(comment);
  userObj.save();
  res.sendStatus(201);
};
