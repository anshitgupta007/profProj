import mongoose, { Schema } from "mongoose";

tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },




}, { timestamps: true });





export const Tweet = mongoose.model("Tweet", tweetSchema);