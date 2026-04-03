import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchDropdown from "../../components/games/SearchDropdown";
import { GAMES, STARTER_PACKS, getRecommendations } from "../../data/mockData";
import { useApp } from "../../context/AppContext";
import "./Home.css";

const QUICK_LIMIT = 10;

export default function Home() {
    const navigate = useNavigate();
    const { setPendingBasketId } = useApp();

    const [selected, setSelected] = useState([]);
    const [count, setCount] = useState(8);

    const addGame = (game) => {
        if (selected.length >= QUICK_LIMIT) return;
        if (selected.find((g) => g.id === game.id)) return;
        setSelected((prev) => [...prev, game]);
    };

    const removeGame = (id) => setSelected((prev) => prev.filter((g) => g.id !== id));

    const addStarterPack = (pack) => {
        const packGames = pack.gameIds.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean);
        const existing = new Set(selected.map((g) => g.id));
        const toAdd = packGames.filter((g) => !existing.has(g.id));
        setSelected((prev) => [...prev, ...toAdd].slice(0, QUICK_LIMIT));
    };

    const handleGenerate = () => {
        if (!selected.length) return;
        const recs = getRecommendations(count);
        sessionStorage.setItem("attuned_recs", JSON.stringify(recs));
        sessionStorage.setItem("attuned_source", JSON.stringify(selected.map((g) => g.title)));
        navigate("/recommendations");
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
                <div className="home__search">
                    <SearchDropdown
                        excludeIds={selected.map((g) => g.id)}
                        onSelect={addGame}
                        placeholder="Начни вводить название игры…"
                        disabled={selected.length >= QUICK_LIMIT}
                    />
                </div>

                {/* SELECTED CHIPS */}
                {selected.length > 0 && (
                    <div className="chips-wrap">
                        <p className="chips-label">
                            Выбрано <strong>{selected.length}</strong> из {QUICK_LIMIT}
                        </p>
                        <div className="chips-list">
                            {selected.map((g) => (
                                <div key={g.id} className="chip">
                                    <div className="chip__cover" style={{ backgroundImage: `url(${g.cover})` }}>
                                        <span>{g.title[0]}</span>
                                    </div>
                                    <span className="chip__name">{g.title}</span>
                                    <button className="chip__remove" onClick={() => removeGame(g.id)} aria-label="Убрать">
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
                        className={`btn-generate ${!selected.length ? "btn-generate--disabled" : ""}`}
                        onClick={handleGenerate}
                        disabled={!selected.length}
                    >
                        Найти игры
                    </button>
                </div>
            </section>

            {/* STARTER PACKS */}
            {selected.length === 0 && (
                <section className="packs-section">
                    <p className="section-eyebrow">Быстрый старт</p>
                    <h2 className="section-title">Выбери свой стиль</h2>
                    <div className="packs-grid">
                        {STARTER_PACKS.map((pack) => (
                            <button key={pack.id} className="pack-card" onClick={() => addStarterPack(pack)}>
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
                        {GAMES.slice(0, 10).map((g) => (
                            <button key={g.id} className="pop-card" onClick={() => addGame(g)}>
                                <div className="pop-card__cover" style={{ backgroundImage: `url(${g.cover})` }}>
                                    <span>{g.title[0]}</span>
                                </div>
                                <span className="pop-card__title">{g.title}</span>
                                <span className="pop-card__year">{g.year}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}