import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, STARTER_PACKS } from "../../context/AppContext";
import { SearchDropdown, PreFilters } from "../../components/games";
import { DEFAULT_PRE_FILTERS } from "../../components/games/PreFilters";
import { getRecommendations, searchGamesByIds } from "../../api";
import "./Profile.css";

export default function Profile() {
    const navigate = useNavigate();
    const {
        isPro, baskets, limits,
        activeBasketId, setActiveBasketId,
        addBasket, removeBasket, renameBasket,
        addGameToBasket, removeGameFromBasket, fillBasketFromPack,
        getBasket,
    } = useApp();

    const [newBasketName, setNewBasketName] = useState("");
    const [addingBasket, setAddingBasket] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [loading, setLoading] = useState(false);
    const [preFilters, setPreFilters] = useState(DEFAULT_PRE_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    const activeBasket = getBasket(activeBasketId);
    const hasActiveFilters = preFilters.platforms.length > 0 || preFilters.releasedOnly !== DEFAULT_PRE_FILTERS.releasedOnly;

    const handleAddBasket = () => {
        const name = newBasketName.trim() || `Коллекция ${baskets.length + 1}`;
        addBasket(name);
        setNewBasketName("");
        setAddingBasket(false);
    };

    const startEdit = (basket) => {
        setEditingId(basket.id);
        setEditName(basket.name);
    };

    const saveEdit = () => {
        if (editName.trim()) renameBasket(editingId, editName.trim());
        setEditingId(null);
    };

    const handleGenerate = async (basket) => {
        if (!basket.games.length)
            return;

        setLoading(true);
        try {
            const liked_ids = basket.games.map((g) => g.igdb_ids);
            const recs = await getRecommendations({
                liked_igdb_ids: liked_ids,
                limit: 10,
                platforms: preFilters.platforms,
                only_released: preFilters.releasedOnly
            });

            sessionStorage.setItem("attuned_recs", JSON.stringify(recs));
            sessionStorage.setItem("attuned_source", JSON.stringify(basket.games.map((g) => g.title)));
            sessionStorage.setItem("attuned_source_ids", JSON.stringify(liked_ids));
            navigate("/recommendations");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const canAddBasket = baskets.length < limits.baskets;

    return (
        <div className="profile">
            <div className="profile__sidebar">
                <div className="sidebar__head">
                    <h2 className="sidebar__title">Коллекции</h2>
                    <div className="plan-badge" data-pro={isPro}>
                        {isPro ? "Pro" : "Free"}
                    </div>
                </div>

                <div className="basket-list">
                    {baskets.map((b) => (
                        <button
                            key={b.id}
                            className={`basket-tab ${b.id === activeBasketId ? "basket-tab--active" : ""}`}
                            onClick={() => setActiveBasketId(b.id)}
                        >
                            <div className="basket-tab__info">
                                {editingId === b.id ? (
                                    <input
                                        className="basket-tab__rename"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                                saveEdit();
                                            if (e.key === "Escape")
                                                setEditingId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="basket-tab__name">{b.name}</span>
                                )}
                                <span className="basket-tab__count">
                                    {b.games.length} / {limits.gamesPerBasket}
                                </span>
                            </div>
                            <div className="basket-tab__actions" onClick={(e) => e.stopPropagation()}>
                                <button className="icon-btn"
                                        onClick={() => startEdit(b)}
                                        title="Переименовать"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                    </svg>
                                </button>
                                {baskets.length > 1 && (
                                    <button className="icon-btn icon-btn--danger"
                                            onClick={() => removeBasket(b.id)}
                                            title="Удалить"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Add basket */}
                {canAddBasket ? (
                    addingBasket ? (
                        <div className="new-basket-form">
                            <input
                                className="new-basket-input"
                                placeholder="Название коллекции…"
                                value={newBasketName}
                                onChange={(e) => setNewBasketName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                        handleAddBasket();
                                    if (e.key === "Escape")
                                        setAddingBasket(false);
                                }}
                                autoFocus
                            />
                            <div className="new-basket-actions">
                                <button className="btn-sm btn-sm--primary"
                                        onClick={handleAddBasket}
                                >
                                    Создать
                                </button>
                                <button className="btn-sm"
                                        onClick={() => setAddingBasket(false)}
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="btn-add-basket" onClick={() => setAddingBasket(true)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            Новая коллекция
                        </button>
                    )
                ) : (
                    <div className="limit-notice">
                        <p>Достигнут лимит коллекций.</p>
                        {!isPro && (
                            <p className="limit-notice__pro">
                                Получи <strong>Pro</strong> — до 5 коллекций.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="profile__main">
                {activeBasket ? (
                    <>
                        <div className="basket-header">
                            <div>
                                <h1 className="basket-title">{activeBasket.name}</h1>
                                <p className="basket-subtitle">
                                    {activeBasket.games.length} игр · лимит {limits.gamesPerBasket}
                                </p>
                            </div>
                            <div className="basket-header__actions">
                                {activeBasket.games.length > 0 && (
                                    <button className={`btn-toggle-filters ${showFilters ? "btn-toggle-filters--active" : ""}`}
                                            onClick={() => setShowFilters((v) => !v)}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" />
                                        </svg>
                                        Фильтры
                                        {hasActiveFilters && (
                                            <span className="filters-dot" />
                                        )}
                                    </button>
                                )}

                                <button
                                    className={`btn-generate-basket ${(!activeBasket.games.length || loading) ? "btn-generate-basket--disabled" : ""}`}
                                    onClick={() => handleGenerate(activeBasket)}
                                    disabled={!activeBasket.games.length || loading}
                                >
                                    {loading
                                        ? <span className="btn-spinner-small" />
                                        : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                                            </svg>
                                        )
                                    }
                                    {loading ? "Загрузка..." : "Подобрать по коллекции"}
                                </button>
                            </div>
                        </div>

                        <div className={`basket-prefilters-wrapper ${showFilters && activeBasket.games.length > 0 ? "basket-prefilters-wrapper--open" : ""}`}>
                            <div className="basket-prefilters">
                                <PreFilters filters={preFilters} onChange={setPreFilters} />
                            </div>
                        </div>

                        {/* SEARCH */}
                        <div className="basket-search">
                            <SearchDropdown
                                excludeIds={activeBasket.games.map((g) => g.igdb_id)}
                                onSelect={(game) => addGameToBasket(activeBasket.id, game)}
                                placeholder="Добавь игру в коллекцию..."
                                disabled={activeBasket.games.length >= limits.gamesPerBasket}
                            />
                        </div>

                        {/* GAMES LIST */}
                        {activeBasket.games.length > 0 ? (
                            <div className="basket-games">
                                {activeBasket.games.map((g) => (
                                    <div key={g.igdb_id} className="basket-row">
                                        <div className="basket-row__cover"
                                             style={{ backgroundImage: g.cover_url ? `url(${g.cover_url})` : "none" }}
                                        >
                                            <span>{g.name?.[0] ?? "?"}</span>
                                        </div>
                                        <div className="basket-row__info">
                                            <span className="basket-row__title">{g.name}</span>
                                            <span className="basket-row__meta">
                                                {g.genres?.join(" · ")}
                                                {g.first_release_date ? ` · ${g.first_release_date.slice(0, 4)}` : ""}
                                            </span>
                                        </div>
                                        <button
                                            className="icon-btn icon-btn--danger"
                                            onClick={() => removeGameFromBasket(activeBasket.id, g.igdb_id)}
                                            title="Убрать из коллекции"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* EMPTY STATE — STARTER PACKS */
                            <div className="empty-state">
                                <p className="empty-state__title">Коллекция пуста</p>
                                <p className="empty-state__sub">
                                    {loading ? "Загрузка пака..." : "Добавь игры вручную или выбери стартовый набор:"}
                                </p>
                                <div className="packs-grid">
                                    {STARTER_PACKS.map((pack) => (
                                        <button
                                            key={pack.id}
                                            className="pack-pill"
                                            disabled={loading}
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    const result = await searchGamesByIds(pack.gameIds);
                                                    const games = result?.items ?? result ?? [];
                                                    fillBasketFromPack(activeBasket.id, games);
                                                } catch (err) {
                                                    console.error(err);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        >
                                            <span>{pack.emoji}</span>
                                            <span>{pack.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="empty-state__title">Выбери коллекцию слева</p>
                )}
            </div>
        </div>
    );
}
