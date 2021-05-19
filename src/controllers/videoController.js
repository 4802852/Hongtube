import Video from "../models/video";

export const home = async (req, res) => {
    // callback 방법
    // Video.find({}, (error, videos) => {
    //     return res.render("home", { pageTitle: "Home", videos });
    // });
    // promising 방법 : await async 추가
    const videos = await Video.find({});
    return res.render("home", { pageTitle: "Home", videos });

};
export const watch = async (req, res) => {
    // const id = req.params.id;
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) {
        return res.render("404", { pageTitle: "Video not found." });
    }
    return res.render("watch", { pageTitle: video.title, video });
};

export const getEdit = async (req, res) => {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) {
        return res.render("404", { pageTitle: "Video not found." });
    }
    return res.render("edit", { pageTitle: `Edit: ${video.title}`, video });
};
export const postEdit = async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
    return res.render("upload", { pageTitle: `Upload Video` });
};
export const postUpload = async (req, res) => {
    const { title, description, hashtags } = req.body;
    try {
        await Video.create({
            title: title,
            description: description,
            // createdAt: Date.now(),
            // default date 지정을 통해 삭제 가능
            hashtags: hashtags.split(",").map(word => `#${word}`),
        });
        return res.redirect("/");
    } catch (error) {
        return res.render("upload", {
            pageTitle: `Upload Video`,
            errorMessage: error._message,
        });
    }
    
}