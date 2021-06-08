import User from "../models/user";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import Video from "../models/video";

export const getJoin = (req, res) =>
  res.render("join", {
    pageTitle: "Join",
  });
export const postJoin = async (req, res) => {
  const { name, email, username, password, password2, location } = req.body;
  const pageTitle = "Join";
  if (password !== password2) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "Password confirmation does not match.",
    });
  }
  const exists = await User.exists({
    $or: [
      {
        username,
      },
      {
        email,
      },
    ],
  });
  if (exists) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: "This username or email is already taken.",
    });
  }
  try {
    await User.create({
      name,
      email,
      username,
      password,
      location,
    });
  } catch (error) {
    return res.status(400).render("join", {
      pageTitle,
      errorMessage: error._message,
    });
  }
  req.flash("success", "Welcome to Hongtube!");
  res.redirect("/login");
};
export const getLogin = (req, res) =>
  res.render("login", {
    pageTitle: "Login",
  });
export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const pageTitle = "Login";
  // check if account exists
  const user = await User.findOne({
    username,
    socialOnly: false,
  });
  if (!user) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "An account with this username does not exists.",
    });
  }
  // check if password correct
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).render("login", {
      pageTitle,
      errorMessage: "Wrong password",
    });
  }
  // user login
  req.session.loggedIn = true;
  req.session.user = user;
  res.redirect("/");
};

export const startGithubLogin = (req, res) => {
  const baseUrl = "https://github.com/login/oauth/authorize";
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: "read:user user:email",
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};
export const finishGithubLogin = async (req, res) => {
  const baseUrl = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
  if ("access_token" in tokenRequest) {
    //access api
    const { access_token } = tokenRequest;
    const apiUrl = "https://api.github.com";
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailObj = emailData.find(
      (email) => email.primary === true && email.verified === true
    );
    if (!emailObj) {
      return res.redirect("/login");
    }
    // Github ? •ë³´ì— primary, verified ?´ë©”ì¼?´ ?žˆ?„ ê²½ìš°, ?´ë©”ì¼ê³? ?™?¼?•œ ?´ë©”ì¼?„ ê°?ì§? User ê°ì²´ë¥? ì°¾ìŒ
    // ì¡°ê±´?— ?•´?‹¹?•˜?Š” Userê°? ì¡´ìž¬?•  ê²½ìš° ê·? Userë¡? ë¡œê·¸?¸?„ ?—ˆ?š©, ?—†?„ ê²½ìš° ê³„ì •?„ ?ƒ?„±.
    let user = await User.findOne({
      email: emailObj.email,
    });
    if (!user) {
      // create an account
      user = await User.create({
        name: userData.name,
        avatarUrl: userData.avatar_url,
        email: emailObj.email,
        username: userData.login,
        password: "",
        socialOnly: true,
        location: userData.location,
      });
    }
    // and login
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
  } else {
    return res.redirect("/login");
  }
};

export const logout = (req, res) => {
  req.flash("info", "ByeBye");
  req.session.destroy();
  return res.redirect("/");
};

export const getEdit = (req, res) => {
  return res.render("edit-profile", {
    pageTitle: "Edit Profile",
  });
};
export const postEdit = async (req, res) => {
  // const { user } = req.session;
  // const { name, email, username, location } = req.body;
  // ES6?—?„œ ?œ„?˜ ?‘ ì¤„ì„ ?•„?ž˜?˜ ì¤„ì²˜?Ÿ¼ ?˜¼?•©?•˜?—¬ ?“¸ ?ˆ˜ ?žˆ?‹¤.
  const {
    session: {
      user: { _id, avatarUrl, email: oldEmail, username: oldUsername },
    },
    body: { name, email, username, location },
    // userRouter ?˜ postEdit ?—?„œ multer middleware ë¥? ì¶”ê???•´ì£¼ì—ˆê¸? ?•Œë¬¸ì— req.file ?„ ?‚¬?š©?•  ?ˆ˜ ?žˆ?‹¤.
    file,
  } = req;
  const pageTitle = "Edit Profile";
  // emailê³? username?´ ?ˆ˜? •?˜?—ˆ?Š”ì§? ?™•?¸?•˜?—¬, ?ˆ˜? •?˜?—ˆ?„ ê²½ìš° ê¸°ì¡´ ì¤‘ë³µ?œ email ?˜¹??? username?´ ?žˆ?Š”ì§? ?™•?¸?•˜?—¬ errorMessage ? „?†¡
  if (oldEmail !== email) {
    const emailExists = await User.exists({
      email,
    });
    if (emailExists) {
      res.status(400).render("edit-profile", {
        pageTitle,
        errorMessage: "This email is already taken",
      });
    }
  }
  if (oldUsername !== username) {
    const usernameExists = await User.exists({
      username,
    });
    if (usernameExists) {
      res.status(400).render("edit-profile", {
        pageTitle,
        errorMessage: "This username is already taken",
      });
    }
  }
  const isHeroku = process.env.NODE_ENV === "production";
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    {
      // file ?´ ì¡´ìž¬?•˜ë©? file.path ë¥? ????ž¥?•˜ê³?, ?—†?‹¤ë©? ê¸°ì¡´?˜ avatarUrl ?„ ?œ ì§??•œ?‹¤.
      avatarUrl: file ? (isHeroku ? file.location : file.path) : avatarUrl,
      name,
      email,
      username,
      location,
    },
    {
      new: true,
    }
  );
  req.session.user = updatedUser;
  req.flash("success", "Change saved.");
  return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
  if (req.session.user.socialOnly) {
    req.flash("error", "Can't change password.");
    return res.redirect("/");
  }
  return res.render("users/change-password", {
    pageTitle: "Change Password",
  });
};
export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id, password },
    },
    body: { oldPassword, newPassword, newPassword2 },
  } = req;
  const pageTitle = "Change Password";
  const ok = await bcrypt.compare(oldPassword, password);
  if (!ok) {
    return res.status(400).render("users/change-password", {
      pageTitle,
      errorMessage: "The current password is incorrect",
    });
  }
  if (newPassword !== newPassword2) {
    return res.status(400).render("users/change-password", {
      pageTitle,
      errorMessage: "The password does not match the confirmation",
    });
  }
  const user = await User.findById(_id);
  user.password = newPassword;
  // user.save() ?Š” userSchema ?˜ save ë¥? ?ž‘?™?‹œì¼? password ë¥? hash ?‹œ?‚¨?‹¤.
  user.save();
  // session ?—…?°?´?Š¸
  req.session.user.password = user.password;
  req.flash("success", "Password Updated");
  return res.redirect("/users/logout");
};

export const see = async (req, res) => {
  const { id } = req.params;
  // Double Populate
  const user = await User.findById(id).populate({
    path: "videos",
    populate: { path: "owner", model: "User" },
  });
  if (!user) {
    return res.status(404).render("404", {
      pageTitle: "User not found",
    });
  }
  return res.render("users/profile", {
    pageTitle: `${user.name}'s Profile`,
    user,
  });
};
