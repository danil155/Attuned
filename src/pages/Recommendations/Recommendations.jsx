import {useState, useEffect, use} from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../../components/games/GameCard";
import { getRecommendations } from "../../api";
import "./Recommendations.css";

const GENRES = ["Все", "RPG", "Action", "Indie", "Soulslike", "Open World", "Roguelite", "Adventure"];

export default function Recommendations() {
    const navigate = useNavigate();

    const [recs, setRecs] = useState([]);
    const [source, setSource] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState({});
    const [genreFilter, setGenreFilter] = useState("Все");
    const [sourceIds, setSourceIds] = useState([]);

    useEffect(() => {
        const stored = sessionStorage.getItem("attuned_recs");
        const storedSource = sessionStorage.getItem("attuned_source");
        const storedSourceIds = sessionStorage.getItem("attuned_source_ids");

        if (!stored) {
            navigate("/");
            return;
        }

        setTimeout(() => {
            setRecs(JSON.parse(stored));
            if (storedSource) setSource(JSON.parse(storedSource));
            if (storedSourceIds) setSourceIds(JSON.parse(storedSourceIds));
            setLoading(false);
        }, 1800);
    }, [navigate]);

    const handleDislike = (id) => {
        setRecs((prev) => prev.filter((r) => r.igdb_id !== id));
    };

    const handleRate = (id, val) => {
        setRatings((prev) => ({ ...prev, [id]: val }));
    };

    const addMore = async () => {
        try {
            const extra = await getRecommendations({
                liked_igdb_ids: sourceIds,
                seen_igdb_ids: (recs?.items || recs || []).map(r => r.igdb_id),
                limit: 4,
            });

            if (extra && extra.length > 0) {
                setRecs((prev) => [...prev, ...extra]);
            }
        } catch (error) {
            console.error("Error when uploading recommendations:", error);
        }
    };

    const filtered = genreFilter === "Все"
        ? recs
        : (recs?.items || recs || []).filter((r) => r.genres && r.genres.includes(genreFilter));

    return (
        <div className="recs-page">
            <div className="recs-page__inner">

                {/* HEADER */}
                <div className="recs-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Назад
                    </button>

                    {source.length > 0 && (
                        <p className="recs-source">
                            На основе: <span>{source.slice(0, 3).join(", ")}{source.length > 3 ? ` и ещё ${source.length - 3}` : ""}</span>
                        </p>
                    )}
                </div>

                {loading ? (
                    <>
                        <div className="recs-loading">
                            <div className="recs-loading__spinner" />
                            <p className="recs-loading__text">Подбираем игры…</p>
                            <p className="recs-loading__sub">Анализируем твои предпочтения</p>
                        </div>
                        <div className="skeleton-grid">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.07}s` }} />
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="recs-controls">
                            <div>
                                <h1 className="recs-title">
                                    {filtered.length} <span>рекомендаций</span>
                                </h1>
                            </div>
                            <div className="recs-controls__right">
                                <div className="genre-filter">
                                    {GENRES.map((g) => (
                                        <button
                                            key={g}
                                            className={`genre-btn ${genreFilter === g ? "genre-btn--active" : ""}`}
                                            onClick={() => setGenreFilter(g)}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                                <button className="btn-more" onClick={addMore}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                    </svg>
                                    Ещё игры
                                </button>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="recs-empty">
                                <p>По жанру «{genreFilter}» ничего нет.</p>
                                <button className="btn-reset" onClick={() => setGenreFilter("Все")}>Показать все</button>
                            </div>
                        ) : (
                            <div className="recs-grid">
                                {(filtered?.items || filtered || []).map((r, i) => (
                                    <GameCard
                                        key={r.igdb_id}
                                        game={r}
                                        rating={ratings[r.igdb_id] || 0}
                                        onRate={handleRate}
                                        onDislike={handleDislike}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
