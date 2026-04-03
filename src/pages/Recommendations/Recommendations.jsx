import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GameCard from "../../components/games/GameCard";
import { getRecommendations } from "../../data/mockData";
import "./Recommendations.css";

const GENRES = ["Все", "RPG", "Action", "Indie", "Soulslike", "Open World", "Roguelite", "Adventure"];

export default function Recommendations() {
    const navigate = useNavigate();

    const [recs, setRecs] = useState([]);
    const [source, setSource] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState({});
    const [genreFilter, setGenreFilter] = useState("Все");

    useEffect(() => {
        const stored = sessionStorage.getItem("attuned_recs");
        const storedSource = sessionStorage.getItem("attuned_source");

        if (!stored) {
            navigate("/");
            return;
        }

        // Simulate loading for feel
        setTimeout(() => {
            setRecs(JSON.parse(stored));
            if (storedSource) setSource(JSON.parse(storedSource));
            setLoading(false);
        }, 1800);
    }, [navigate]);

    const handleDislike = (id) => {
        setRecs((prev) => prev.filter((r) => r.id !== id));
    };

    const handleRate = (id, val) => {
        setRatings((prev) => ({ ...prev, [id]: val }));
    };

    const addMore = () => {
        const extra = getRecommendations(4).map((r) => ({ ...r, id: r.id + Date.now() }));
        setRecs((prev) => [...prev, ...extra]);
    };

    const filtered = genreFilter === "Все"
        ? recs
        : recs.filter((r) => r.genre.includes(genreFilter));

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
                                {filtered.map((r, i) => (
                                    <GameCard
                                        key={r.id}
                                        game={r}
                                        rating={ratings[r.id] || 0}
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