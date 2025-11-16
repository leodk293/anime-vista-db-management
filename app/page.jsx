"use client";
import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "https://api.jikan.moe/v4";
const API_DELAY = 3000;

export default function Home() {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [successMessage, setSuccessMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [searchedAnime, setSearchedAnime] = useState("");

  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [userId, setUserId] = useState("");

  // Fixed: Using function to generate search endpoint dynamically
  const ANIME_ENDPOINTS = {
    recommended: `${API_BASE_URL}/recommendations/anime`,
    popular: `${API_BASE_URL}/top/anime?filter=bypopularity`,
    top: `${API_BASE_URL}/top/anime`,
    upcoming: `${API_BASE_URL}/seasons/upcoming`,
    recent: `${API_BASE_URL}/seasons/now`,
    airing: `${API_BASE_URL}/top/anime?filter=airing`,
    getSearchEndpoint: (query) =>
      `${API_BASE_URL}/anime?q=${encodeURIComponent(
        query
      )}&order_by=popularity&sort=asc&sfw=true`,
  };

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

      let animeIds,
        animeData = [];
      if (category === "recommended") {
        const animeEntries = data.data.flatMap((item) => item.entry);
        animeIds = animeEntries.map((entry) => entry.mal_id);
      } else if (category === "searched anime") {
        // Fixed: Limit to top 25 results instead of processing all
        const limitedData = data.data.slice(0, 25);
        animeIds = limitedData.map((item) => item.mal_id);
        animeData = limitedData.map((item) => ({
          mal_id: item.mal_id,
          title: item.title,
          image_url: item.images?.jpg?.large_image_url || "",
          score: item.score,
          year: item.aired?.prop?.from?.year || "N/A",
        }));
        setSearchResults(animeData);
        setShowResults(true);
      } else {
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

  async function fetchWatchListAnime(userId) {
    setLoading(true);
    setError(null);
    setSuccessMessage("");
    setActiveCategory("watchlist");
    setProgress({ current: 0, total: 0 });

    try {
      const res = await fetch(
        `https://anime-vista.netlify.app/api/watch-list?userId=${userId}`
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      let animeIds = [];

      if (result.data && Array.isArray(result.data)) {
        animeIds = result.data
          .map((item) => item.animeId)
          .filter((id) => id != null && id !== "");
      } else if (Array.isArray(result)) {
        animeIds = result
          .map((item) => item.animeId)
          .filter((id) => id != null && id !== "");
      }

      if (animeIds.length === 0) {
        throw new Error(
          "No anime found in watchlist or invalid response structure"
        );
      }

      setAnimeList(animeIds);
      setSuccessMessage(`Loaded ${animeIds.length} anime from watchlist`);
    } catch (error) {
      setError(`Failed to load watchlist anime: ${error.message}`);
      console.error("Error fetching watchlist anime:", error);
    } finally {
      setLoading(false);
    }
  }

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

  // Fixed: Use function to generate endpoint with current searchedAnime value
  const getSearchedAnimeList = () =>
    fetchAnimeList(
      ANIME_ENDPOINTS.getSearchEndpoint(searchedAnime),
      "searched anime"
    );

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchedAnime.trim()) {
      getSearchedAnimeList();
    } else {
      setError("Please enter an anime name to search");
    }
  };

  // Handle watchlist submission
  const handleWatchlistSubmit = () => {
    if (userId.trim()) {
      fetchWatchListAnime(userId.trim());
    } else {
      setError("Please enter a user ID");
    }
  };

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

      {/* Search Input */}
      <div className="mt-10 flex justify-center items-center">
        <input
          onChange={(event) => setSearchedAnime(event.target.value)}
          value={searchedAnime}
          onKeyPress={(e) => e.key === "Enter" && handleSearchSubmit()}
          className="border border-gray-500 outline-0 text-gray-300 text-xl font-medium px-4 py-2 rounded-tl-[5px] rounded-bl-[5px] bg-transparent"
          placeholder="Store searched anime..."
          type="text"
          disabled={loading}
        />
        <button
          onClick={handleSearchSubmit}
          disabled={loading || !searchedAnime.trim()}
          className={`
            border outline-0 border-gray-500 border-l-transparent px-4 py-2 text-xl rounded-tr-[5px] rounded-br-[5px]
            ${
              loading || !searchedAnime.trim()
                ? "cursor-not-allowed opacity-50 bg-gray-600"
                : "cursor-pointer bg-gray-500 hover:bg-gray-400"
            }
          `}
        >
          {loading && activeCategory === "searched anime" ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Submit"
          )}
        </button>
      </div>

      {/* Watchlist Input */}
      <div className="text-white flex flex-row">
        <input
          onChange={(event) => setUserId(event.target.value)}
          value={userId}
          onKeyPress={(e) => e.key === "Enter" && handleWatchlistSubmit()}
          className="border border-gray-500 outline-0 text-gray-300 text-xl font-medium px-4 py-2 rounded-tl-[5px] rounded-bl-[5px] bg-transparent"
          type="text"
          placeholder="Enter user ID to load watchlist"
          disabled={loading}
        />
        <button
          onClick={handleWatchlistSubmit}
          disabled={loading || !userId.trim()}
          className={`
            border outline-0 border-gray-500 border-l-transparent px-4 py-2 text-xl rounded-tr-[5px] rounded-br-[5px]
            ${
              loading || !userId.trim()
                ? "cursor-not-allowed opacity-50 bg-gray-600"
                : "cursor-pointer bg-gray-500 hover:bg-gray-400"
            }
          `}
        >
          {loading && activeCategory === "watchlist" ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Submit"
          )}
        </button>
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
          Select a category to load anime data from the Jikan API, or search for
          specific anime using the search form. The system will automatically
          store each anime in your database with a 1-second delay between
          requests to respect rate limits.
        </p>
      </div>

      {/* Search Results Display */}
      {showResults && searchResults.length > 0 && (
        <div className="w-full max-w-4xl mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">
              Search Results for "{searchedAnime}"
            </h2>
            <button
              onClick={() => setShowResults(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((anime) => (
              <div
                key={anime.mal_id}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
              >
                <div className="p-4">
                  <h3 className="font-semibold text-white text-lg mb-2 line-clamp-2">
                    {anime.title}
                  </h3>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Year: {anime.year}</span>
                    {anime.score && <span>Score: {anime.score}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
