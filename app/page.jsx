"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

// Constants
const API_BASE_URL = "https://api.jikan.moe/v4";
const API_DELAY = 1000; // 1 second delay between requests

const ANIME_ENDPOINTS = {
  recommended: `${API_BASE_URL}/recommendations/anime`,
  popular: `${API_BASE_URL}/top/anime?filter=bypopularity`,
  top: `${API_BASE_URL}/top/anime`,
  upcoming: `${API_BASE_URL}/seasons/upcoming`,
  recent: `${API_BASE_URL}/seasons/now`,
  airing: `${API_BASE_URL}/top/anime?filter=airing`,
};

export default function Home() {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [successMessage, setSuccessMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  // Generic function to fetch anime list
  const fetchAnimeList = useCallback(async (endpoint, category) => {
    setLoading(true);
    setError(null);
    setSuccessMessage("");
    setActiveCategory(category);
    setProgress({ current: 0, total: 0 });

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let animeIds;
      if (category === "recommended") {
        // Handle recommended anime structure
        const animeEntries = data.data.flatMap((item) => item.entry);
        animeIds = animeEntries.map((entry) => entry.mal_id);
      } else {
        // Handle other anime list structures
        animeIds = data.data.map((item) => item.mal_id);
      }

      setAnimeList(animeIds);
      setSuccessMessage(`Loaded ${animeIds.length} ${category} anime titles`);
    } catch (err) {
      setError(`Failed to load ${category} anime: ${err.message}`);
      console.error(`Error fetching ${category} anime:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Individual fetch functions
  const getRecommendedAnimeList = () =>
    fetchAnimeList(ANIME_ENDPOINTS.recommended, "recommended");
  const getUpcomingAnimeList = () =>
    fetchAnimeList(ANIME_ENDPOINTS.upcoming, "upcoming");
  const getRecentAnimeList = () =>
    fetchAnimeList(ANIME_ENDPOINTS.recent, "recent");
  const getAiringAnimeList = () =>
    fetchAnimeList(ANIME_ENDPOINTS.airing, "airing");
  const getPopularAnimeList = () =>
    fetchAnimeList(ANIME_ENDPOINTS.popular, "popular");
  const getTopAnimeList = () => fetchAnimeList(ANIME_ENDPOINTS.top, "top");

  // Store anime with better error handling and validation
  const storeAnimeById = async (animeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/anime/${animeId}/full`);

      if (!response.ok) {
        throw new Error(`Failed to fetch anime ${animeId}: ${response.status}`);
      }

      const data = await response.json();
      const animeData = data.data;

      // Validate required data
      if (!animeData.mal_id || !animeData.title) {
        throw new Error(`Invalid anime data for ID ${animeId}`);
      }

      const storePayload = {
        animeName: animeData.title_english || animeData.title,
        animeImage: animeData.images?.jpg?.large_image_url || "",
        animeId: animeData.mal_id,
        genres: animeData.genres || [],
        year: animeData.aired?.prop?.from?.year || null,
        season: animeData.season || null,
      };

      const storeResponse = await fetch("/api/store-anime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(storePayload),
      });

      if (!storeResponse.ok) {
        const errorData = await storeResponse.json();
        throw new Error(errorData.error || "Failed to store anime");
      }

      const result = await storeResponse.json();
      console.log(`Successfully stored: ${storePayload.animeName}`);
      return result;
    } catch (error) {
      console.error(`Error storing anime ${animeId}:`, error.message);
      throw error;
    }
  };

  // Process anime list with better progress tracking and error handling
  const processAnimeList = useCallback(async () => {
    if (animeList.length === 0) return;

    setProgress({ current: 0, total: animeList.length });
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < animeList.length; i++) {
      const animeId = animeList[i];

      try {
        await storeAnimeById(animeId);
        successCount++;
      } catch (error) {
        errorCount++;
      }

      setProgress({ current: i + 1, total: animeList.length });

      // Add delay between requests to respect rate limits
      if (i < animeList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, API_DELAY));
      }
    }

    // Update success message with results
    setSuccessMessage(
      `Processing complete! Successfully stored: ${successCount}, Failed: ${errorCount}`
    );
  }, [animeList]);

  // Process anime list when it changes
  useEffect(() => {
    if (animeList.length > 0) {
      processAnimeList();
    }
  }, [animeList, processAnimeList]);

  // Clear messages after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Button configuration
  const buttons = [
    {
      onClick: getRecommendedAnimeList,
      label: "Load recommended anime",
      category: "recommended",
    },
    {
      onClick: getUpcomingAnimeList,
      label: "Load upcoming anime",
      category: "upcoming",
    },
    {
      onClick: getRecentAnimeList,
      label: "Load recent anime",
      category: "recent",
    },
    {
      onClick: getAiringAnimeList,
      label: "Load airing anime",
      category: "airing",
    },
    {
      onClick: getPopularAnimeList,
      label: "Load popular anime",
      category: "popular",
    },
    { onClick: getTopAnimeList, label: "Load top anime", category: "top" },
  ];

  return (
    <div className="flex flex-col text-white gap-6 items-center mt-10 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold">AnimeVista Database Management</h1>
        <p className="text-xl text-gray-300">Anime Database Population Tool</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {buttons.map(({ onClick, label, category }) => (
          <button
            key={category}
            onClick={onClick}
            disabled={loading}
            className={`
              border px-6 py-3 rounded-full transition-all duration-200 font-medium
              ${
                loading && activeCategory === category
                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                  : "border-gray-500 hover:border-gray-300 hover:bg-gray-700/50"
              }
              ${
                loading
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:scale-105"
              }
            `}
          >
            {loading && activeCategory === category ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : (
              label
            )}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      {progress.total > 0 && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Storing anime to database</span>
            <span>
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      <div className="text-center min-h-[24px]">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {successMessage && !error && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-2 rounded-lg">
            <p>{successMessage}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-gray-400 text-sm max-w-2xl">
        <p>
          Select a category to load anime data from the Jikan API. The system
          will automatically store each anime in your database with a 1-second
          delay between requests to respect rate limits.
        </p>
      </div>
    </div>
  );
}
