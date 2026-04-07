import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchDropdown, PreFilters } from "../../components/games";
import { DEFAULT_PRE_FILTERS } from "../../components/games/PreFilters";
import { getRecommendations, searchGames, searchGamesByIds } from "../../api";
import { STARTER_PACKS } from "../../context/AppContext";
import "./Home.css";

const QUICK_LIMIT = 10;

export default function Home() {
    const navigate = useNavigate();

    const [selected, setSelected] = useState([]);
    const [count, setCount] = useState(8);
    const [preFilters, setPreFilters] = useState(DEFAULT_PRE_FILTERS);
    const [popularGames, setPopularGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const hasActiveFilters = preFilters.platforms.length > 0 || preFilters.releasedOnly !== DEFAULT_PRE_FILTERS.releasedOnly;

    // ИЗМЕНИТЬ НА РЕАЛЬНО ПОПУЛЯРНЫЕ ИГРЫ (ТЕ, КОТОРЫЕ ЛАЙКАЮТ ПОЛЬЗОВАТЕЛИ ATTUNED)
    useEffect(() => {
        searchGames("A", 10).then(setPopularGames).catch(console.error);
    }, []);

    const addGame = (game) => {
        if (selected.length >= QUICK_LIMIT)
            return;
        if (selected.find((g) => g.igdb_id === game.igdb_id))
            return;
        setSelected((prev) => [...prev, game]);
    };

    const removeGame = (igdb_id) =>
        setSelected((prev) => prev.filter((g) => g.igdb_id !== igdb_id));

    const addStarterPack = async (pack) => {
        setLoading(true);

        try {
            const result = await searchGamesByIds(pack.gameIds);

            const packGames = result?.items ?? result ?? [];
            const existing = new Set(selected.map((g) => g.igdb_id));
            const toAdd = packGames.filter((g) => !existing.has(g.igdb_id));
            setSelected((prev) => [...prev, ...toAdd].slice(0, QUICK_LIMIT));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selected.length)
            return;

        setLoading(true);
        try {
            const liked_ids = selected.map(g => g.igdb_id);

            const recs = await getRecommendations({
                liked_igdb_ids: liked_ids,
                limit: count,
                platforms: preFilters.platforms,
                only_released: preFilters.releasedOnly
            });

            sessionStorage.setItem("attuned_recs", JSON.stringify(recs));
            sessionStorage.setItem("attuned_source", JSON.stringify(selected.map((g) => g.name)));
            sessionStorage.setItem("attuned_source_ids", JSON.stringify(liked_ids));
            navigate("/recommendations")
        } catch (error) {
            console.error('Error when receiving recommendations: ', error)
            alert('Не удалось получить рекомендации. Попробуйте позже.')
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home">
            <div className="grain" />

            {/* HERO */}
            <section className="hero">
                <div className="hero__glow" />
                <div className="hero__eyebrow">
                    <span className="pulse-dot" />
                    Более 250 000 игровых проектов
                </div>
                <h1 className="hero__title">
                    НАЙДИ СВОЮ<br />
                    <span className="hero__accent">СЛЕДУЮЩУЮ</span><br />
                    ИГРУ
                </h1>
                <p className="hero__sub">
                    Выбери до {QUICK_LIMIT} любимых игр — и мы построим персональную подборку,
                    которая тебя не разочарует.
                </p>

                {/* SEARCH */}
                <div className="hero__actions">
                    <div className="home__search">
                        <SearchDropdown
                            excludeIds={selected.map((g) => g.igdb_id)}
                            onSelect={addGame}
                            placeholder="Начни вводить название игры…"
                            disabled={selected.length >= QUICK_LIMIT}
                        />
                    </div>

                    <button className={`btn-toggle-filters ${showFilters ? "btn-toggle-filters--active" : ""}`}
                            onClick={() => setShowFilters(!showFilters)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" />
                        </svg>
                        Фильтры
                        {hasActiveFilters && <span className="filters-dot" />}
                    </button>
                </div>

                {selected.length > 0 && (
                    <div className="home__prefilters">
                        <PreFilters filters={preFilters} onChange={setPreFilters} />
                    </div>
                )}

                {/* SELECTED CHIPS */}
                {selected.length > 0 && (
                    <div className="chips-wrap">
                        <p className="chips-label">
                            Выбрано <strong>{selected.length}</strong> из {QUICK_LIMIT}
                        </p>
                        <div className="chips-list">
                            {selected.map((g) => (
                                <div key={g.igdb_id} className="chip">
                                    <div className="chip__cover"
                                         style={{ backgroundImage: g.cover_url ? `url(${g.cover_url})` : "none"}}
                                    >
                                        <span>{g.name?.[0] ?? "?"}</span>
                                    </div>
                                    <span className="chip__name">{g.name}</span>
                                    <button className="chip__remove"
                                            onClick={() => removeGame(g.igdb_id)}
                                            aria-label="Убрать"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CONTROLS */}
                <div className="hero__controls">
                    <div className="count-group">
                        <span className="count-label">Рекомендаций</span>
                        <div className="count-btns">
                            {[4, 8, 12, 16].map((n) => (
                                <button
                                    key={n}
                                    className={`count-btn ${count === n ? "count-btn--active" : ""}`}
                                    onClick={() => setCount(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className={`btn-generate ${(!selected.length || loading) ? "btn-generate--disabled" : ""}`}
                        onClick={handleGenerate}
                        disabled={!selected.length || loading}
                    >
                        {loading ? "Загрузка..." : "Найти игры"}
                    </button>
                </div>

                <div className="hero__actions">

                </div>

                <div className={`filters-wrapper ${showFilters ? "filters-wrapper--open" : ""}`}>
                    <div className="filters-inner">
                        <PreFilters filters={preFilters} onChange={setPreFilters} />
                    </div>
                </div>
            </section>

            {/* STARTER PACKS */}
            {selected.length === 0 && (
                <section className="packs-section">
                    <p className="section-eyebrow">Быстрый старт</p>
                    <h2 className="section-title">Выбери свой стиль</h2>
                    <div className="packs-grid">
                        {STARTER_PACKS.map((pack) => (
                            <button key={pack.id}
                                    className="pack-card"
                                    onClick={() => addStarterPack(pack)}
                                    disabled={loading}
                            >
                                <span className="pack-card__emoji">{pack.emoji}</span>
                                <span className="pack-card__name">{pack.name}</span>
                                <span className="pack-card__desc">{pack.description}</span>
                                <span className="pack-card__count">{pack.gameIds.length} игр</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* POPULAR */}
            {selected.length === 0 && (
                <section className="popular-section">
                    <p className="section-eyebrow">Популярные сейчас</p>
                    <div className="popular-grid">
                        {(popularGames?.items || popularGames || []).map((g) => (
                            <button key={g.id}
                                    className="pop-card"
                                    onClick={() => addGame(g)}
                            >
                                <div className="pop-card__cover"
                                     style={{ backgroundImage: g.cover_url ? `url(${g.cover_url})` : "none" }}>
                                    <span>{g.name?.[0] ?? "?"}</span>
                                </div>
                                <span className="pop-card__title">{g.name}</span>
                                <span className="pop-card__year">
                                    {g.first_release_date?.slice(0, 4)}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}