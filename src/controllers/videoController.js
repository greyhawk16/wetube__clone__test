import Video from "../models/Video";
import User from "../models/User";
import Comment from "../models/Comment";
import { connect } from "mongoose";
// import { async } from "regenerator-runtime";


// Video.find({}, (error, videos) => {
//     console.log("Search Finished");
// });

export const home = async (req, res) => {
    const videos = await Video.find({}).sort({ createdAt: "desc" }).populate("owner");
    return res.render("home", { pageTitle: "Home", videos });
};
  


export const watch = async (req, res) => {
    const { id } = req.params;
    const video = await Video.findById(id).populate("owner").populate("comments");
    // console.log(video);
    if (!video) {
        return res.status(404).render("404", { pageTitle: "Video Not Found" });
    }
    return res.render("watch", { pageTitle: video.title, video });
};



export const getEdit = async (req, res) => {
    const { id } = req.params;
    const {
        user: { _id }
    } = req.session;
    const video = await Video.findById(id);
    // console.log(video);
    if (!video) {
        return res.status(404).render("404", { pageTitle: "Video Not Found" });
    }
    if (String(video.owner) !== String(_id)) {
        req.flash("error", "Not Authorized");
        return res.status(403).redirect("/");
    }
    return res.render("edit", { pageTitle: `Edit: ${video.title}`, video});
};



export const postEdit = async (req, res) => {
    const { id } = req.params;
    const {
        user: { _id }
    } = req.session;
    const { title, description, hashtags } = req.body;
    const video = await Video.findById( id );
    if (!video) {
        return res.render("404", { pageTitle: "Video Not Found" });
    }
    if (String(video.owner) !== String(_id)) {
        return res.status(403).redirect("/");
    }
    await Video.findByIdAndUpdate(id, {
        title,
        description,
        hashtags: Video.formatHashtags(hashtags),
    });
    req.flash("success", "Changes saved");
    res.redirect(`/videos/${id}`);
};



export const getUpload = (req, res) => {
    return res.render("upload", { pageTitle: "upload Video" });
};



export const postUpload = async (req, res) => {
    //add a video to video array
    const { user: { _id }, } = req.session;
    const { video, thumb } = req.files;
    // console.log(video, thumb);
    const { title, description, hashtags } = req.body;
    try {
        const newVideo = await Video.create({
            title,
            description,
            fileUrl: Video.changePathFormula(video[0].path),
            thumbUrl: Video.changePathFormula(thumb[0].path),
            owner: _id,
            hashtags: Video.formatHashtags(hashtags),
        });
        const user = await User.findById(_id);
        user.videos.push(newVideo._id);
        user.save();
        return res.redirect("/");
    } catch (error) {
        return res.status(400).render("upload", {
            pageTitle: "upload Video",
            errorMessage: error._message,
        });
    }
};



export const deleteVideo = async (req, res) => {
    const { id } = req.params;
    const {
        user: { _id }
    } = req.session;
    const video = await Video.findById(id);
    if (!video) {
        return res.status(404).render("404", { pageTitle: "Video Not Found" });
    }
    if (String(video.owner) !== String(_id)) {
        return res.status(403).redirect("/");
    }

    await Video.findByIdAndDelete(id);
    return res.redirect("/");
};



export const search = async (req, res) => {
    const { keyword } = req.query;
    let videos = [];
    if (keyword) {
        videos = await Video.find({
            title: {
                $regex: new RegExp(`${keyword}$`, "i"),
            },
        }).populate("owner");
    }
    return res.render("search", { pageTitle: "Search", videos });
}



export const registerView = async (req, res) => {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
        return res.sendStatus(404);
    } 
    video.meta.views = video.meta.views + 1;
    await video.save();
    return res.sendStatus(200);
}



export const createComment = async (req, res) => {
    const {
        session: { user },
        body: { text },
        params: { id },
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
    video.comments.push(comment._id);
    user.comments.push(comment._id);
    video.save();
    return res.status(201).json({ newCommentId: comment._id });
};


export const deleteComment = async (req, res) => {
    const {
        session: {
          user: { _id },
        },
        params: { id },
    } = req;

    const comment = await Comment.findById(id);
    if (!comment) {
        req.flash("error", "We've looked everywhere, but couldn't find the comment");
        return res.status(403).redirect("/");
      }
    // console.log(comment);
    
    if (String(comment.owner._id) !== String(_id)) {
        req.flash("error", "You are not the owner of video.");
        return res.status(403).redirect("/");
    }

    await Comment.findByIdAndDelete(id);
    const commentOwner = await User.findById(_id);
    commentOwner.comments.pop(id);
    commentOwner.save();

    req.session.user = commentOwner;
    const video = await Video.findById(comment.video);
    video.comments.pop(id);
    video.save();

    return res.sendStatus(201);
};