import mongoose, { Schema, models } from "mongoose";

const animeSchema = new Schema(
    {
        animeName: {
            type: String,
            required: true,
        },
        animeImage: {
            type: String,
            required: true,
        },
        animeId: {
            type: String,
            required: true,
        },
        genres: {
            type: Array,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        season: {
            type: String,
            required: true,
        }

    },
    { timestamps: true }
);

const AnimeList = models.AnimeList || mongoose.model("AnimeList", animeSchema);

export default AnimeList;