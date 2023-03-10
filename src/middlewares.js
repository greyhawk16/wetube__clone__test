import multer from "multer";

export const localsMiddleware = (req, res, next) => {
    // console.log(req.session);

    res.locals.loggedIn = Boolean(req.session.loggedIn);
    res.locals.siteName = "Wetube";
    res.locals.loggedInUser = req.session.user || {};
    // console.log(req.session.user);
    next();
}


export const protectorMiddleware = (req, res, next) => {
    if (req.session.loggedIn) {
        return next();
    } else {
        req.flash("error", "Log in Please");
        return res.redirect("/login");
    }
};


export const publicOnlyMiddleware = (req, res, next) => {
    if (!req.session.loggedIn) {
        return next();
    } else {
        req.flash("error", "You are logged in");
        return res.redirect("/");
    }
};


export const avatarUpload = multer({ dest: "uploads/avatars/", limits:{
    fileSize: 3000000,
} });
export const videoUpload = multer({ dest: "uploads/videos/", limits:{
    fileSize: 10000000,
} });