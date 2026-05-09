import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchDropdown, PreFilters } from "../../components/games";
import { DEFAULT_PRE_FILTERS } from "../../components/games/PreFilters";
import { getRecommendations, getPopularGames, searchGamesByIds } from "../../api";
import { STARTER_PACKS } from "../../context/AppContext";
import { useError } from "../../context";
import { StyleEmoji } from "../../services/StyleEmoji";
import "./Home.css";

const MIN_GAMES = 3;
const MAX_GAMES = 10;

export default function Home() {
    const navigate = useNavigate();

    const { showError } = useError();

    const [selected, setSelected] = useState([]);
    const [count, setCount] = useState(8);
    const [preFilters, setPreFilters] = useState(DEFAULT_PRE_FILTERS);
    const [popularGames, setPopularGames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const hasActiveFilters = preFilters.platforms.length > 0 || preFilters.releasedOnly !== DEFAULT_PRE_FILTERS.releasedOnly;
    const isValidSelection = selected.length >= MIN_GAMES && selected.length <= MAX_GAMES;

    useEffect(() => {
        getPopularGames(10)
            .then(response => {
                const games = response?.items ?? response ?? [];
                setPopularGames(games);
            })
            .catch(error => {
                console.error('Failed to load popular games:', error);
                showError('Не удалось загрузить популярные игры');
            });
    }, []);

    useEffect(() => {
        if (selected.length === 0) {
            setShowFilters(false);
        }
    }, [selected.length])

    const addGame = (game) => {
        if (selected.length >= MAX_GAMES)
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
            setSelected((prev) => [...prev, ...toAdd].slice(0, MAX_GAMES));
        } catch (error) {
            console.error(error);
            showError('Не удалось загрузить стартовый набор игр')
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!isValidSelection) {
            if (selected.length < MIN_GAMES) {
                showError(`Выберите минимум ${MIN_GAMES} игры для получения рекомендаций`)
            }
            return;
        }

        if (!selected.length)
            return;

        setLoading(true);
        try {
            const preferences = selected.map(g => g.igdb_id);

            const recs = await getRecommendations({
                preferences: preferences,
                limit: count,
                niche: preFilters.niche,
                platforms: preFilters.platforms,
                only_released: preFilters.releasedOnly
            });

            sessionStorage.setItem('attuned_recs', JSON.stringify(recs));
            sessionStorage.setItem('attuned_source', JSON.stringify(selected.map((g) => g.name)));
            sessionStorage.setItem('attuned_source_type', 'games');
            sessionStorage.setItem('attuned_source_ids', JSON.stringify(preferences));
            navigate("/recommendations")
        } catch (error) {
            console.error('Error when receiving recommendations: ', error)
            showError('Не удалось получить рекомендации. Попробуйте позже.')
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
                    Выбери от {MIN_GAMES} до {MAX_GAMES} любимых игр - и мы построим персональную подборку,
                    которая тебя не разочарует.
                </p>

                {/* SEARCH */}
                <div className="hero__actions">
                    <div className="home__search">
                        <SearchDropdown
                            excludeIds={selected.map((g) => g.igdb_id)}
                            onSelect={addGame}
                            placeholder="Начни вводить название игры…"
                            disabled={selected.length >= MAX_GAMES}
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

                {/* SELECTED CHIPS */}
                {selected.length > 0 && (
                    <div className="chips-wrap">
                        <p className="chips-label">
                            Выбрано <strong>{selected.length}</strong> из {MAX_GAMES}
                            {selected.length < MIN_GAMES && selected.length > 0 && (
                                <span>
                                    <br />(нужно минимум <strong>{MIN_GAMES}</strong>)
                                </span>
                            )}
                        </p>
                        <div className="chips-list">
                            {selected.map((g) => (
                                <div key={g.igdb_id} className="chip">
                                    <div className="chip__cover"
                                         style={{ backgroundImage: g.cover_url ? `url(${g.cover_url})` : "none"}}
                                    >
                                        {!g.cover_url && (
                                            <span>{g.name?.[0] ?? "?"}</span>
                                        )}
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
                        disabled={!isValidSelection || loading}
                    >
                        {loading ? "Загрузка..." : "Найти игры"}
                    </button>
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
                                <div className="pack-card__emoji-wrapper">
                                    <StyleEmoji
                                        emoji={pack.emoji}
                                        className="pack-card__emoji"
                                        size="30px"
                                    />
                                </div>
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
                            <button key={g.igdb_id}
                                    className="pop-card"
                                    onClick={() => addGame(g)}
                            >
                                <div className="pop-card__cover"
                                     style={{ backgroundImage: g.cover_url ? `url(${g.cover_url})` : "none" }}>
                                    {!g.cover_url && (
                                        <span>{g.name?.[0] ?? "?"}</span>
                                    )}
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
