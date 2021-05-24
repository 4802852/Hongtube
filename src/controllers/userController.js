import User from "../models/user";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });
export const postJoin = async (req, res) => {
    const { name, email, username, password, password2, location } = req.body;
    const pageTitle = "Join";
    if (password !== password2) {
        return res.status(400).render("join", {
            pageTitle,
            errorMessage: "Password confirmation does not match.",
        });
    };
    const exists = await User.exists({ $or: [{ username }, { email }] });
    if (exists) {
        return res.status(400).render("join", {
            pageTitle,
            errorMessage: "This username or email is already taken.",
        });
    };
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
    };
    res.redirect("/login");
};
export const getLogin = (req, res) => res.render("login", { pageTitle: "Login" });
export const postLogin = async (req, res) => {
    const { username, password } = req.body;
    const pageTitle = "Login";
    // check if account exists
    const user = await User.findOne({ username, socialOnly: false });
    if (!user) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "An account with this username does not exists.",
        });
    };
    // check if password correct
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "Wrong password",
        });
    };
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
        scope: "read:user user:email"
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
        code: req.query.code
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
                }
            })
        ).json();
        const emailData = await (
            await fetch(`${apiUrl}/user/emails`, {
                headers: {
                    Authorization: `token ${access_token}`,
                }
            })
        ).json();
        const emailObj = emailData.find(
            (email) => email.primary === true && email.verified === true
        );
        if (!emailObj) {
            return res.redirect("/login");
        }
        // Github 정보에 primary, verified 이메일이 있을 경우, 이메일과 동일한 이메일을 가진 User 객체를 찾음
        // 조건에 해당하는 User가 존재할 경우 그 User로 로그인을 허용, 없을 경우 계정을 생성.
        let user = await User.findOne({ email: emailObj.email });
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
    req.session.destroy();
    return res.redirect("/");
};

export const getEdit = (req, res) => {
    return res.render("edit-profile", { pageTitle: "Edit Profile" });
};
export const postEdit = async (req, res) => {
    // const { user } = req.session;
    // const { name, email, username, location } = req.body;
    // ES6에서 위의 두 줄을 아래의 줄처럼 혼합하여 쓸 수 있다.
    const {
        session: {
            user: { _id, email: oldEmail, username: oldUsername },
        },
        body: { name, email, username, location },
    } = req;
    const pageTitle = "Edit Profile";
    // email과 username이 수정되었는지 확인하여, 수정되었을 경우 기존 중복된 email 혹은 username이 있는지 확인하여 errorMessage 전송
    if (oldEmail !== email) {
        const emailExists = await User.exists({ email });
        if (emailExists) {
            res.status(400).render("edit-profile", { pageTitle, errorMessage: "This email is already taken" });
        }
    }
    if (oldUsername !== username) {
        const usernameExists = await User.exists({ username });
        if (usernameExists) {
            res.status(400).render("edit-profile", { pageTitle, errorMessage: "This username is already taken" });
        }
    }
    const updatedUser = await User.findByIdAndUpdate(_id, { name, email, username, location }, { new: true });
    req.session.user = updatedUser;
    return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
    if (req.session.user.socialOnly) {
        return res.redirect("/");
    }
    return res.render("users/change-password", { pageTitle: "Change Password" });
};
export const postChangePassword = async (req, res) => {
    const {
        session: {
            user: { _id, password },
        },
        body: { oldPassword, newPassword, newPassword2 }
    } = req;
    const pageTitle = "Change Password";
    const ok = await bcrypt.compare(oldPassword, password);
    if (!ok) {
        return res.status(400).render("users/change-password", { pageTitle, errorMessage: "The current password is incorrect" });
    }
    if (newPassword !== newPassword2) {
        return res.status(400).render("users/change-password", { pageTitle, errorMessage: "The password does not match the confirmation" });
    }
    const user = await User.findById(_id);
    user.password = newPassword;
    // user.save() 는 userSchema 의 save 를 작동시켜 password 를 hash 시킨다.
    user.save();
    // session 업데이트
    req.session.user.password = user.password;
    return res.redirect("/users/logout");
};

export const see = (req, res) => res.send("see");