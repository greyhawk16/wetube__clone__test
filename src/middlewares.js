import multer from "multer";
import multerS3 from "multer-s3";
import aws from "aws-sdk";


const s3 = new aws.S3({
    credentials: {
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRET,
    }
});

const multerUploader = multerS3({
    s3: s3,
    bucket: 'wetube1111111'
});


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


export const avatarUpload =
    multer({
        dest: "uploads/avatars/",
        limits: {
            fileSize: 3000000,
        },
        storage: multerUploader,
    });
    
export const videoUpload =
    multer({
        dest: "uploads/videos/",
        limits: {
            fileSize: 10000000,
        },
        storage: multerUploader,
    });
    // AWS bucket 에 프로필 사진이 안올라옴