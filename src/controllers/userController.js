import bcrypt from "bcrypt";
import User from "../models/User";


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
    const user = await User.findOne({ username });
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
    console.log("Logged User In. coming soon");
    return res.redirect("/");
};

export const edit = (req, res) => {
    res.send("Edit User");
};
export const remove = (req, res) => {
    res.send("Remove User");
};

export const logout = (req, res) => {
    res.send("LogOut");
};
export const see = (req, res) => {
    res.send("See User");
};