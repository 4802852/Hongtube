import mongoose, { connections } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    avatarUrl: String,
    socialOnly: { type: Boolean, default: false },
    username : { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    location: String,
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
});

userSchema.pre("save", async function() {
    // 아래의 if 조건을 추가하지 않으면, user 를 수정할 때마다 비밀번호를 새로 hash 하게 되어 비밀번호를 확인할 수 없다.
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 5);
    }
});

const User = mongoose.model("User", userSchema);
export default User;