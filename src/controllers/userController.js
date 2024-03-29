import bcrypt from "bcrypt";
import User from "../models/User";
import Video from "../models/Video";
import fetch from "node-fetch";


export const getJoin = (req, res) => {
    res.render("join", { pageTitle: "Join" });
};


export const postJoin = async (req, res) => {
    const pageTitle = "Join";

    const { name, email, username, password, password2, location } = req.body;
    if (password !== password2) {
        return res.status(400).render("join", {
            pageTitle,
            errorMessage: "Password confirmation Does Not match.",
        });
    }

    const exists = await User.exists({ $or: [{ username }, { email }] });
    if (exists) {
        return res.status(400).render("join", {
            pageTitle,
            errorMessage: "This username / email is already taken.",
        });
    }
    try {
        await User.create({
            name,
            username,
            email,
            password,
            location,
        });
        return res.redirect("/login");
    } catch(error) {
        return res.status(400).render("join", {
            pageTitle: "unknown error",
            errorMessage: error._message,
        });
    }
};


export const getLogin = (req, res) => {
    res.render("login", { pageTitle: "Login" });
};


export const postLogin = async (req, res) => {
    /// check if account exists
    /// check if password is correct
    const { username, password } = req.body;
    const pageTitle = "Login";
    const user = await User.findOne({ username, socialOnly: false });
    if (!user) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "Account with this username does not exist",
        });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "Wrong password",
        });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
};


export const startGithubLogin = (req, res) => {
    const baseUrl = "https://github.com/login/oauth/authorize";
    const config = {
        client_id: process.env.GH_CLIENT,
        allow_signup: true,
        scope: "read:user user:email",
    };
    const params = new URLSearchParams(config).toString();
    const finalUrl = `${baseUrl}?${params}`;
    return res.redirect(finalUrl);
};


export const finishGithubLogin = async (req, res) => {
    const baseUrl = `https://github.com/login/oauth/access_token`;
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
        //access API
        const { access_token } = tokenRequest;
        const apiUrl = "https://api.github.com";
        const userData = await(await fetch(`${apiUrl}/user`, {
            headers: {
                    Authorization: `token ${access_token}`,
                },
            })
        ).json();
        // console.log(userData);

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

        let user = await User.findOne({ email: emailObj.email });
        if (!user) {
            user = await User.create({
                avatarUrl: userData.avatar_url,
                name: userData.name,
                username: userData.login,
                email: emailObj.email,
                password: "",
                socialOnly: true,
                location: userData.location,
            });
        }
        req.session.loggedIn = true;
        req.session.user = user;
        return res.redirect("/");

    } else {
        return res.redirect("/login");
    }
};



export const logout = (req, res) => {
    req.session.destroy();
    req.flash("info", "Bye * 2");
    return res.redirect("/");
};



export const getEdit = (req, res) => {
    return res.render("edit-profile", { pageTitle: "Edit Proflie" });
};



export const postEdit = async (req, res) => {
    const {
        session: {
          user: { _id, avatarUrl },
        },
        body: { name, email, username, location },
        file,
    } = req;
    console.log(file);
    // curEmail: email before update
    // curUsername: username before update
    const curEmail = req.session.user.email; 
    const curUsername = req.session.user.username;

    // if (updated email) !== (previous email) => email is changed
    if (email !== curEmail) {
        // if updated email("email") already exists
        if (Boolean(await User.exists({ email }))) {
            // CANNOT use updated email
            return res.status(400).render("edit-profile", {
                pageTitle: "Edit Proflie",
                errorMessage: "This email has been taken. Please try new one :(",
            });
        }
    }

    // if (updated username) !== (previous username) => username is changed
    if (username !== curUsername) {
        // if updated username("username") already exists
        if (Boolean(await User.exists({ username }))) {
            // CANNOT use the updated username
            return res.status(400).render("edit-profile", {
                pageTitle: "Edit Proflie",
                errorMessage: "Someone is using this username. Please try new one :(",
            });
        }
    }

    const updatedUser = await User.findByIdAndUpdate(_id, {
        avatarUrl: file ? file.path : avatarUrl,
        name,
        email,
        username,
        location,
        },
        { new: true }
    );
    req.session.user = updatedUser;
    return res.redirect("/users/edit");
};



export const getChangePassword = (req, res) => {
    if (req.session.user.socialOnly) {
        req.flash("error", "Social users CANNOT change password");
        return res.redirect("/");
    }
    return res.render("users/change-password", { pageTitle: "Change Password" });
};



export const postChangePassword = async (req, res) => {
    const {
        session: {
            user: { _id, },
        },
        body: { oldPassword, newPassword, newPasswordConfirmation },
    } = req;

    const user = await User.findById(_id);
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "Current Password is incorrect",
        });
    }

    if (newPassword !== newPasswordConfirmation) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "New Password does NOT match",
        });
    }

    if (newPassword === oldPassword) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "New password and old password are the SAME.",
        });
    }
    
    user.password = newPassword;
    await user.save();
    req.flash("info", "password updated");

    req.session.destroy();
    return res.redirect('/login');
};


export const see = async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).populate({
        path: "videos",
        populate: {
            path: "owner",
            model: "User",
        }
    });
    // console.log(user);
    if (!user) {
        return res.status(404).render("404", {
            pageTitle: "User Not Found",
        });
    }
    // console.log(videos);
    return res.render("users/profile", {
        pageTitle: `${user.name}의 Profile`,
        user,
    });
};