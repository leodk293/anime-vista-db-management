import { NextResponse } from "next/server";
import AnimeList from "@/animeList";
import { connectMongoDB } from "@/connectMongoDb";

export async function DELETE(request) {
    try {
        const { animeId } = await request.json();

        if (!animeId) {
            return NextResponse.json({ error: "Missing animeId" }, { status: 400 });
        }

        await connectMongoDB();

        // Find and delete the anime by animeId
        const deletedAnime = await AnimeList.findOneAndDelete({ animeId });

        if (!deletedAnime) {
            return NextResponse.json({ error: "Anime not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                message: "Anime deleted successfully",
                anime: deletedAnime,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting anime:", error);
        return NextResponse.json(
            { error: "Failed to delete anime" },
            { status: 500 }
        );
    }
}
