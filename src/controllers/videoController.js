import User from "../models/user";
import Comment from "../models/comment";
import Video from "../models/video";

export const home = async (req, res) => {
  // callback 방법
  // Video.find({}, (error, videos) => {
  //     return res.render("home", { pageTitle: "Home", videos });
  // });
  // promising 방법 : await async 추가
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
  // populate 는 Video 모델에 연결된 Object를 동시에 불러와준다.
  // mongoose가 Video 안의 owner 가 User Object의 id 인 것을 알고 해당 Object 를 owner에 불러와준다.
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
  // video 의 owner 와 현재 로그인한 user 를 비교하여 수정할 수 있는 권한을 확인해줌
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
  try {
    const newVideo = await Video.create({
      title: title,
      description: description,
      fileUrl: video[0].path,
      thumbUrl: thumb[0].path,
      owner: _id,
      // createdAt: Date.now(),
      // default date 지정을 통해 삭제 가능
      hashtags: Video.formatHashtags(hashtags),
    });
    // User 의 Videos Array 에 새로 등록하는 video 의 id 를 추가해줌
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
