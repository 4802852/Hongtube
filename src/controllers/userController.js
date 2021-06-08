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
    // Github ?��보에 primary, verified ?��메일?�� ?��?�� 경우, ?��메일�? ?��?��?�� ?��메일?�� �?�? User 객체�? 찾음
    // 조건?�� ?��?��?��?�� User�? 존재?�� 경우 �? User�? 로그?��?�� ?��?��, ?��?�� 경우 계정?�� ?��?��.
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
  // ES6?��?�� ?��?�� ?�� 줄을 ?��?��?�� 줄처?�� ?��?��?��?�� ?�� ?�� ?��?��.
  const {
    session: {
      user: { _id, avatarUrl, email: oldEmail, username: oldUsername },
    },
    body: { name, email, username, location },
    // userRouter ?�� postEdit ?��?�� multer middleware �? 추�???��주었�? ?��문에 req.file ?�� ?��?��?�� ?�� ?��?��.
    file,
  } = req;
  const pageTitle = "Edit Profile";
  // email�? username?�� ?��?��?��?��?���? ?��?��?��?��, ?��?��?��?��?�� 경우 기존 중복?�� email ?��??? username?�� ?��?���? ?��?��?��?�� errorMessage ?��?��
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
      // file ?�� 존재?���? file.path �? ????��?���?, ?��?���? 기존?�� avatarUrl ?�� ?���??��?��.
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
  // user.save() ?�� userSchema ?�� save �? ?��?��?���? password �? hash ?��?��?��.
  user.save();
  // session ?��?��?��?��
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
