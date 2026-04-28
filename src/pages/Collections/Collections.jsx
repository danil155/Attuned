import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import { useApp, STARTER_PACKS, LIKES_BASKET_ID, DISLIKES_BASKET_ID } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { SearchDropdown, PreFilters } from "../../components/games";
import { DEFAULT_PRE_FILTERS } from "../../components/games/PreFilters";
import { getRecommendations, searchGamesByIds, importSteamLibrary } from "../../api";
import "./Collections.css";

const VIRTUAL_META = {
    [LIKES_BASKET_ID]: { emoji: "❤️",  color: "#ff6b6b", label: "Добавляются автоматически при нажатии «Нравится»" },
    [DISLIKES_BASKET_ID]: { emoji: "🚫",  color: "#9a9590", label: "Добавляются автоматически при нажатии «Не интересно»" },
}

export default function Collections() {
    const navigate = useNavigate();
    const {
        isPro, baskets, carts, limits,
        activeBasketId, setActiveBasketId,
        addBasket, removeBasket, renameBasket, refreshBasket,
        addGameToBasket, removeGameFromBasket, fillBasketFromPack,
        getBasket,
    } = useApp();

    const { token } = useAuth();

    const [newBasketName, setNewBasketName] = useState('');
    const [addingBasket, setAddingBasket] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [loading, setLoading] = useState(false);
    const [preFilters, setPreFilters] = useState(DEFAULT_PRE_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    const [showSteamImport, setShowSteamImport] = useState(false);
    const [steamImportClosing, setSteamImportClosing] = useState(false);
    const [steamInput, setSteamInput] = useState('');
    const [steamImporting, setSteamImporting] = useState(false);
    const [steamImportResult, setSteamImportResult] = useState(null);
    const [steamError, setSteamError] = useState(null);

    const [displayedBasketId, setDisplayedBasketId] = useState(activeBasketId)
    const [isAnimating, setIsAnimating] = useState(false);

    const activeBasket = getBasket(activeBasketId);
    const isVirtual = activeBasket?.isVirtual ?? false;
    const virtualMeta = isVirtual ? VIRTUAL_META[activeBasketId] : null;
    const basketGames = activeBasket?._gameObjects ?? [];
    const hasGameObjects = basketGames.length > 0 && basketGames[0]?.igdb_id;
    const gamesToShow = hasGameObjects ? basketGames : [];

    const hasActiveFilters = preFilters.platforms.length > 0 || preFilters.releasedOnly !== DEFAULT_PRE_FILTERS.releasedOnly;

    useEffect(() => {
        setSteamImportResult(null);
        setSteamError(null);
        setShowFilters(false);
    }, [activeBasketId]);

    const handleSwitchBasket = (basketId) => {
        if (basketId === activeBasketId || isAnimating)
            return;

        setIsAnimating(true);

        setTimeout(() => {
            setActiveBasketId(basketId);
            setDisplayedBasketId(basketId);

            setTimeout(() => {
                setIsAnimating(false);
            }, 50);
        }, 250);
    };

    useEffect(() => {
        if (activeBasketId !== displayedBasketId && !isAnimating) {
            setDisplayedBasketId(activeBasketId);
        }
    }, [activeBasketId, displayedBasketId, isAnimating]);

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
            const liked_ids = basket.games
            const recs = await getRecommendations({
                liked_igdb_ids: liked_ids,
                limit: 10,
                platforms: preFilters.platforms,
                released_only: preFilters.releasedOnly
            });

            sessionStorage.setItem('attuned_recs', JSON.stringify(recs));
            sessionStorage.setItem('attuned_source_type', 'collection');
            sessionStorage.setItem('attuned_source_name', basket.name);
            sessionStorage.setItem('attuned_source_ids', JSON.stringify(liked_ids));
            navigate('/recommendations');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSteamImport = async () => {
        if (!steamInput.trim() || !activeBasket)
            return;

        setSteamImporting(true);
        setSteamError(null);
        setSteamImportResult(null);

        try {
            const result = await importSteamLibrary(
                token,
                steamInput.trim(),
                activeBasket.id
            );

            setSteamImportResult(result);

            if (result.added_to_cart > 0) {
                setSteamInput('');
                window.location.reload();
            }

        } catch (error) {
            console.error('Steam import error:', error);
            let errorMessage= error.message || 'Ошибка при импорте из Steam';

            if (error.response?.status === 404) {
                errorMessage = 'Пользователь Steam не найден. Проверьте правильность ID или ссылки.';
            } else if (error.response?.status === 403) {
                errorMessage = 'Профиль Steam закрыт. Сделайте библиотеку игр публичной в настройках конфиденциальности.'
            } else if (error.response?.status === 401) {
                errorMessage = 'Требуется авторизация. Пожалуйста, войдите заново.'
            }

            setSteamError(errorMessage);
        } finally {
            setSteamImporting(false);
        }
    };

    const closeSteamImport = () => {
        setSteamImportClosing(true);
        setTimeout(() => {
            setShowSteamImport(false);
            setSteamImportClosing(false);
            setSteamImportResult(null);
            setSteamError(null);
            setSteamInput('');
        }, 300);
    };

    const canAddBasket = carts.length < limits.baskets;

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
                    <p className="basket-group-label">
                        Автоматические
                    </p>
                    {baskets.filter((b) => b.isVirtual).map((b) => {
                        const meta = VIRTUAL_META[b.id];
                        return (
                            <button
                                key={b.id}
                                className={`basket-tab basket-tab--virtual ${b.id === activeBasketId ? "basket-tab--active" : ""}`}
                                onClick={() => handleSwitchBasket(b.id)}
                            >
                                <div className="basket-tab__info">
                                    <span className="basket-tab__name">
                                        <span className="basket-tab__emoji">{meta.emoji}</span>
                                        {b.name}
                                    </span>
                                    <span className="basket-tab__count">{b.games.length}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="basket-list basket-list--mt">
                    <p className="basket-group-label">
                        Мои коллекции
                    </p>
                    {carts.map((b) => (
                        <div
                            key={b.id}
                            className={`basket-tab ${b.id === activeBasketId ? "basket-tab--active" : ""}`}
                            onClick={() => handleSwitchBasket(b.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveBasketId(b.id);
                                }
                            }}
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
                        </div>
                    ))}

                    {carts.length === 0 && (
                        <p className="basket-list--empty">
                            Нет коллекций
                        </p>
                    )}
                </div>

                {/* ADD BASKET */}
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
                                Получи <strong>Pro</strong> - до 5 коллекций.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="profile__main">
                <div
                    className={`basket-transition-wrapper ${isAnimating ? 'basket-transition-wrapper--exiting' : ''}`}
                >
                    {activeBasket ? (
                        <>
                            <div className="basket-header">
                                <div>
                                    <div className="basket-title-row">
                                        {isVirtual && (
                                            <span className="basket-title-emoji">
                                                {virtualMeta.emoji}
                                            </span>
                                        )}
                                        <h1 className="basket-title">{activeBasket.name}</h1>
                                        {isVirtual && (
                                            <span className="basket-readonly-badge">
                                                авто
                                            </span>
                                        )}
                                    </div>
                                    <p className="basket-subtitle">
                                        {isVirtual
                                            ? virtualMeta.label
                                            : `${activeBasket.games.length} игр · лимит ${limits.gamesPerBasket}`
                                        }
                                    </p>
                                </div>

                                {!isVirtual && (
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
                                                    ''
                                                )
                                            }
                                            {loading ? "Загрузка..." : "Подобрать по коллекции"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={`basket-prefilters-wrapper ${showFilters && activeBasket.games.length > 0 ? "basket-prefilters-wrapper--open" : ""}`}>
                                <div className="basket-prefilters">
                                    <PreFilters filters={preFilters} onChange={setPreFilters} />
                                </div>
                            </div>

                            {/* SEARCH */}
                            {!isVirtual && (
                                <div className="basket-search">
                                    <SearchDropdown
                                        excludeIds={activeBasket.games}
                                        onSelect={(game) => addGameToBasket(activeBasket.id, game)}
                                        placeholder="Добавь игру в коллекцию..."
                                        disabled={activeBasket.games.length >= limits.gamesPerBasket}
                                    />
                                </div>
                            )}

                            {/* STEAM IMPORT */}
                            {!isVirtual && !showSteamImport && activeBasket.games.length < limits.gamesPerBasket && (
                                <div className="steam-import-trigger">
                                    <button
                                        className="btn-steam-import"
                                        onClick={() => setShowSteamImport(true)}
                                    >
                                        Импорт из Steam
                                        <span className="btn-beta-badge-steam">BETA</span>
                                    </button>
                                </div>
                            )}

                            {!isVirtual && (showSteamImport || steamImportClosing) && (
                                <div className={`steam-import-panel ${steamImportClosing ? 'steam-import-panel--closing' : ''}`}>
                                    <div className="steam-import-header">
                                        <h3>Импорт библиотеки игр из Steam</h3>
                                        <button
                                            className="steam-import-close"
                                            onClick={closeSteamImport}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <p className="steam-import-description">
                                        Введите ссылку на профиль Steam, Steam ID или vanity name.<br/>
                                        <strong>Важно:</strong> профиль должен быть открытым (публичным).<br/><br/>
                                        Импорт может быть некорректным! Функция в тестовом режиме.
                                    </p>

                                    <div className="steam-import-form">
                                        <input
                                            type="text"
                                            className="steam-import-input"
                                            placeholder="Например: https://steamcommunity.com/id/username/ или steamid"
                                            value={steamInput}
                                            onChange={(e) => setSteamInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !steamImporting && steamInput.trim()) {
                                                    handleSteamImport();
                                                }
                                            }}
                                            disabled={steamImporting}
                                        />
                                        <button
                                            className="btn-steam-import-submit"
                                            onClick={handleSteamImport}
                                            disabled={steamImporting || !steamInput.trim()}
                                        >
                                            {steamImporting ? (
                                                <>
                                                    <span className="btn-spinner-small" />
                                                    Импорт...
                                                </>
                                            ) : (
                                                "Импортировать"
                                            )}
                                        </button>
                                    </div>

                                    {steamError && (
                                        <div className="steam-import-error">
                                            <span>⚠️</span>
                                            <div>
                                                <strong>Ошибка импорта</strong>
                                                <p>{steamError}</p>
                                                {steamError.includes("private") && (
                                                    <small>Сделайте вашу библиотеку Steam публичной в настройках конфиденциальности</small>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {steamImportResult && (
                                        <div className="steam-import-success">
                                            <span>✅</span>
                                            <div>
                                                <strong>Импорт завершен!</strong>
                                                <p>
                                                    Найдено {steamImportResult.matched} из {steamImportResult.total_steam_games} игр.<br/>
                                                    Добавлено в коллекцию: <strong>{steamImportResult.added_to_cart}</strong>.
                                                </p>
                                                {steamImportResult.unmatched_names && steamImportResult.unmatched_names.length > 0 && (
                                                    <details className="steam-unmatched">
                                                        <summary>Не найденные игры ({steamImportResult.unmatched_names.length})</summary>
                                                        <ul>
                                                            {steamImportResult.unmatched_names.slice(0, 10).map((name, idx) => (
                                                                <li key={idx}>{name}</li>
                                                            ))}
                                                            {steamImportResult.unmatched_names.length > 10 && (
                                                                <li>...и еще {steamImportResult.unmatched_names.length - 10}</li>
                                                            )}
                                                        </ul>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* GAMES LIST */}
                            {gamesToShow.length > 0 ? (
                                <div key={activeBasketId} className="basket-games">
                                    {gamesToShow.map((g, idx) => (
                                        <div
                                            key={g.igdb_id}
                                            className="basket-row"
                                            style={{ '--row-index': idx }}
                                        >
                                            <div className="basket-row__cover"
                                                 style={{ backgroundImage: g?.cover_url ? `url(${g.cover_url})` : "none" }}
                                            >
                                                <span>{g?.name?.[0] ?? g?.igdb_id?.[0] ?? "?"}</span>
                                            </div>
                                            <div className="basket-row__info">
                                                <span className="basket-row__title">{g?.name ?? `Game #${g.igdb_id}`}</span>
                                                <span className="basket-row__meta">
                                                    {g?.genres?.join(" · ") ?? ''}
                                                    {g?.first_release_date ? ` · ${g.first_release_date.slice(0, 4)}` : ""}
                                                </span>
                                            </div>
                                            <button
                                                className="icon-btn icon-btn--danger"
                                                onClick={() => removeGameFromBasket(activeBasket.id, g.igdb_id)}
                                                title={isVirtual ? "Убрать оценку" : "Убрать из коллекции"}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : isVirtual ? (
                                <div className="empty-state">
                                    <span className="empty-state__big-emoji">{virtualMeta.emoji}</span>
                                    <p className="empty-state__title">Пока пусто</p>
                                    <p className="empty-state__sub">{virtualMeta.label}</p>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p className="empty-state__title">Коллекция пуста</p>
                                    <p className="empty-state__sub">
                                        {loading ? "Загружаем игры..." : "Добавь игры вручную или выбери стартовый набор:"}
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
        </div>
    );
}
