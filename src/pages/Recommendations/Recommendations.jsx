import {useState, useEffect, useMemo} from "react";
import { useNavigate } from "react-router-dom";
import { GameCard, RecsFilters } from "../../components/games";
import { DEFAULT_FILTERS } from "../../components/games/RecsFilters";
import { getRecommendations } from "../../api";
import { useGenres } from "../../context/AppContext";
import "./Recommendations.css";

const TODAY = new Date().toISOString().slice(0, 10);

export default function Recommendations() {
    const navigate = useNavigate();
    const { genres } = useGenres();

    const [recs, setRecs] = useState([]);
    const [source, setSource] = useState([]);
    const [sourceType, setSourceType] = useState(null);
    const [sourceName, setSourceName] = useState('');
    const [sourceIds, setSourceIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [loadingMore, setLoadingMore] = useState(false);

    const allPlatforms = useMemo(
        () => [...new Set(recs.flatMap((r) => r.platform ?? []))].sort(),
        [recs]
    );

    useEffect(() => {
        const stored = sessionStorage.getItem('attuned_recs');
        const storedSource = sessionStorage.getItem('attuned_source');
        const storedSourceIds = sessionStorage.getItem('attuned_source_ids');
        const storedSourceType = sessionStorage.getItem('attuned_source_type');
        const storedSourceName = sessionStorage.getItem('attuned_source_name');

        if (!stored) {
            navigate("/");
            return;
        }

        if (storedSourceType === 'collection' && storedSourceName) {
            setSourceType('collection');
            setSourceName(storedSourceName);
        } else if (storedSource) {
            setSourceType('games');
            setSource(JSON.parse(storedSource));
        }

        if (storedSourceIds)
            setSourceIds(JSON.parse(storedSourceIds));

        setTimeout(() => {
            const data = JSON.parse(stored);
            setRecs(data?.items ?? data ?? []);
            setLoading(false);
        }, 1800);
    }, [navigate]);

    const handleDislike = (igdb_id) => {
        setRecs((prev) => prev.filter((r) => r.igdb_id !== igdb_id));
    };

    const addMore = async () => {
        if (loadingMore)
            return;

        try {
            setLoadingMore(true);

            const extra = await getRecommendations({
                liked_igdb_ids: sourceIds,
                seen_igdb_ids: recs.map((r) => r.igdb_id),
                limit: 4,
            });

            const items = extra?.items ?? extra ?? [];

            if (items.length > 0) {
                setRecs((prev) => [...prev, ...items]);

                setTimeout(() => {
                    const newCards = document.querySelectorAll('.recs-grid .game-card');
                    if (newCards.length > 0) {
                        newCards[newCards.length - 4]?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error when uploading recommendations:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const filtered = useMemo(() => {
        return recs.filter((r) => {
            if (filters.releasedOnly && r.first_release_date && r.first_release_date > TODAY)
                return false;
            if (filters.minRating > 0 && (r.rating == null || r.rating < filters.minRating))
                return false;
            if (filters.genres.length > 0 && !r.genres?.some((g) => filters.genres.includes(g)))
                return false;
            if (filters.platforms.length > 0 && !r.platforms?.some((p) => filters.platforms.includes(p)))
                return false;
            return true;
        });
    }, [recs, filters]);

    return (
        <div className="recs-page">
            <div className="recs-page__inner">

                {/* HEADER */}
                <div className="recs-header">
                    <button className="back-btn"
                            onClick={() => navigate(-1)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Назад
                    </button>

                    {sourceType === 'collection' && sourceName && (
                        <p className="recs-source">
                            На основе коллекции: {' '}
                            <span>
                                {sourceName}
                            </span>
                        </p>
                    )}
                    {sourceType === 'games' && source.length > 0 && (
                        <p className="recs-source">
                            На основе: {' '}
                            <span>
                                {source.slice(0, 3).join(', ')}
                                {source.length > 3 ? ` и ещё ${source.length - 3}` : ''}
                            </span>
                        </p>
                    )}
                </div>

                {loading ? (
                    <>
                        <div className="recs-loading">
                            <div className="recs-loading__spinner" />
                            <p className="recs-loading__text">Подбираем игры...</p>
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
                            <h1 className="recs-title">
                                {filtered.length} <span>рекомендаций</span>
                            </h1>
                            <div className="recs-controls__right">
                                <RecsFilters
                                    genres={genres}
                                    platforms={allPlatforms}
                                    filters={filters}
                                    onChange={setFilters}
                                />
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="recs-empty">
                                <p>По выбранным фильтрам ничего не найдено</p>
                                <button className="btn-reset"
                                        onClick={() => setFilters(DEFAULT_FILTERS)}
                                >
                                    Сбросить фильтры
                                </button>
                            </div>
                        ) : (
                            <div className="recs-grid">
                                {filtered.map((r) => (
                                    <GameCard
                                        key={r.igdb_id}
                                        game={r}
                                        onDislike={handleDislike}
                                    />
                                ))}
                            </div>
                        )}
                        {filtered.length > 0 && (
                            <div className="load-more-container">
                                <button
                                    className="btn-more btn-more-bottom"
                                    onClick={addMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <span className="btn-more-spinner"></span>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                            </svg>
                                            Ещё игры
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
