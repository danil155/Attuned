import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { STARTER_PACKS, LIKES_BASKET_ID, DISLIKES_BASKET_ID } from "../../context/AppContext";
import { useApp, useError } from "../../context";
import { SearchDropdown, PreFilters } from "../../components/games";
import { SteamImportModal } from "../../components/steam/SteamImportModal";
import { DEFAULT_PRE_FILTERS } from "../../components/games/PreFilters";
import { getRecommendations, searchGamesByIds } from "../../api";
import { StyleEmoji } from "../../services/StyleEmoji";
import wsService from "../../services/wsService";
import "./Collections.css";

const VIRTUAL_META = {
    [LIKES_BASKET_ID]: { emoji: "🧡",  color: "#ff6b6b", label: 'Добавляются автоматически при нажатии "Нравится"' },
    [DISLIKES_BASKET_ID]: { emoji: "💔",  color: "#9a9590", label: 'Добавляются автоматически при нажатии "Не интересно"' },
}

export default function Collections() {
    const navigate = useNavigate();

    const {
        isPro, baskets, carts, limits,
        activeBasketId, setActiveBasketId,
        addBasket, removeBasket, renameBasket, clearBasket,
        addGameToBasket, removeGameFromBasket, fillBasketFromPack,
        getBasket,
    } = useApp();
    const { showError } = useError();

    const [newBasketName, setNewBasketName] = useState('');
    const [addingBasket, setAddingBasket] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [loading, setLoading] = useState(false);
    const [preFilters, setPreFilters] = useState(DEFAULT_PRE_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    const [showSteamModal, setShowSteamModal] = useState(false);
    const [steamImportResult, setSteamImportResult] = useState(null);

    const [showSteamImport, setShowSteamImport] = useState(false);
    const steamInputRef = useRef(null);

    const [displayedBasketId, setDisplayedBasketId] = useState(activeBasketId)
    const [isAnimating, setIsAnimating] = useState(false);

    const activeBasket = getBasket(activeBasketId);
    const isVirtual = activeBasket?.isVirtual ?? false;
    const virtualMeta = isVirtual ? VIRTUAL_META[activeBasketId] : null;
    const basketGames = activeBasket?._gameObjects ?? [];
    const hasGameObjects = basketGames.length > 0 && basketGames[0]?.igdb_id;
    const gamesToShow = hasGameObjects ? basketGames : [];

    const [confirmAction, setConfirmAction] = useState(null);
    const popconfirmRef = useRef(null);

    const hasActiveFilters = preFilters.platforms.length > 0 || preFilters.releasedOnly !== DEFAULT_PRE_FILTERS.releasedOnly;

    useEffect(() => {
        setSteamImportResult(null);
        setShowFilters(false);
    }, [activeBasketId]);

    useEffect(() => {
        if (confirmAction) {
            popconfirmRef.current?.focus();
        }
    }, [confirmAction]);

    useEffect(() => {
        if (activeBasketId !== displayedBasketId && !isAnimating) {
            setDisplayedBasketId(activeBasketId);
        }
    }, [activeBasketId, displayedBasketId, isAnimating]);

    useEffect(() => {
        if (showSteamImport && steamInputRef.current) {
            setTimeout(() => {
                steamInputRef.current?.focus();
            }, 100);
        }
    }, [showSteamImport]);

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

    const handleAddBasket = () => {
        const name = newBasketName.trim() || `Коллекция ${baskets.length + 1 - 2}`;
        addBasket(name);
        setNewBasketName('');
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
            const preferences = basket.games
            const recs = await getRecommendations({
                preferences: preferences,
                limit: 10,
                niche: preFilters.niche,
                platforms: preFilters.platforms,
                released_only: preFilters.releasedOnly
            });

            sessionStorage.setItem('attuned_recs', JSON.stringify(recs));
            sessionStorage.setItem('attuned_source_type', 'collection');
            sessionStorage.setItem('attuned_source_name', basket.name);
            sessionStorage.setItem('attuned_source_ids', JSON.stringify(preferences));
            navigate('/recommendations');
        } catch (error) {
            console.error(error);
            showError('Не удалось получить рекомендации по коллекции');
        } finally {
            setLoading(false);
        }
    };

    const handleSteamImportSuccess = (result) => {
        setSteamImportResult(result);
        setTimeout(() => {
            setSteamImportResult(null);
        }, 4000);
        wsService.sync();
    }

    const handleGameClick = (e, game) => {
        if (!e.target.closest('.icon-btn')) {
            window.open(game.igdb_url, '_blank');
        }
    };

    const canAddBasket = carts.length < limits.baskets;

    return (
        <>
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
                                            <StyleEmoji
                                                emoji={meta.emoji}
                                                className="basket-tab__emoji"
                                                size="16px"
                                            />
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
                                    <button className="icon-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmAction({ type: 'clear', basketId: b.id, basketName: b.name });
                                            }}
                                            title="Очистить коллекцию"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="8" y1="12" x2="16" y2="12" />
                                        </svg>
                                    </button>
                                    {baskets.length > 1 && (
                                        <button className="icon-btn icon-btn--danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmAction({ type: 'delete', basketId: b.id, basketName: b.name });
                                                }}
                                                title="Удалить коллекцию"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 3h-5.5l-1-1h-3l-1 1H4v2h16V3zm-2 4H6v13c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7zM9 18H7V9h2v9zm4 0h-2V9h2v9zm4 0h-2V9h2v9z"/>
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
                                                <StyleEmoji
                                                    emoji={virtualMeta.emoji}
                                                    className="basket-tab__emoji"
                                                    size="35px"
                                                />
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
                                            onClick={() => setShowSteamModal(true)}
                                        >
                                            Импорт из Steam
                                            <span className="btn-beta-badge-steam">BETA</span>
                                        </button>
                                    </div>
                                )}

                                {!isVirtual && (
                                    <SteamImportModal
                                        isOpen={showSteamModal}
                                        onClose={() => setShowSteamModal(false)}
                                        cartId={activeBasket.id}
                                        cartName={activeBasket.name}
                                        onSuccess={handleSteamImportSuccess}
                                        currentGamesCount={activeBasket.games.length}
                                        gamesLimit={limits.gamesPerBasket}
                                    />
                                )}

                                {steamImportResult && (
                                    <div className="steam-import-success-notification">
                                        <span>✅</span>
                                        <div>
                                            <strong>Импорт завершен!</strong>
                                            <p>Добавлено в коллекцию: <strong>{steamImportResult.added_to_cart}</strong> игр.</p>
                                        </div>
                                    </div>
                                )}

                                {/* GAMES LIST */}
                                {gamesToShow.length > 0 ? (
                                    <div key={activeBasketId} className="basket-games">
                                        {gamesToShow.map((g, idx) => (
                                            <div
                                                key={g.igdb_id}
                                                className="basket-row"
                                                style={{ '--row-index': idx, cursor: 'pointer' }}
                                                onClick={(e) => handleGameClick(e, g)}
                                            >
                                                <div className="basket-row__cover"
                                                     style={{ backgroundImage: g?.cover_url ? `url(${g.cover_url})` : "none" }}
                                                >
                                                    {!g.cover_url && (
                                                        <span>{g?.name?.[0] ?? g?.igdb_id?.[0] ?? "?"}</span>
                                                    )}
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
                                        <div className="empty-state__big-emoji-wrapper">
                                            <StyleEmoji
                                                emoji={virtualMeta.emoji}
                                                className="empty-state__big-emoji"
                                                size="60px"
                                            />
                                        </div>
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
                                                            showError('Не удалось загрузить стартовый набор игр');
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                >
                                                    <StyleEmoji
                                                        emoji={pack.emoji}
                                                        size="14px"
                                                    />
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

            {confirmAction && createPortal(
                <div className="popconfirm-overlay" onClick={() => setConfirmAction(null)}>
                    <div
                        ref={popconfirmRef}
                        className="popconfirm"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (confirmAction.type === 'clear') {
                                    clearBasket(confirmAction.basketId);
                                } else {
                                    removeBasket(confirmAction.basketId);
                                }
                                setConfirmAction(null);
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setConfirmAction(null);
                            }
                        }}
                        tabIndex={-1}
                    >
                        <div className="popconfirm__icon">
                            {confirmAction.type === 'clear' ? '🧹' : '🗑️'}
                        </div>
                        <p className="popconfirm__text">
                            {confirmAction.type === 'clear'
                                ? `Очистить коллекцию "${confirmAction.basketName}"?`
                                : `Удалить коллекцию "${confirmAction.basketName}"?`}
                        </p>
                        <p className="popconfirm__sub">
                            {confirmAction.type === 'clear'
                                ? 'Все игры будут удалены. Действие нельзя отменить.'
                                : 'Коллекция и все игры в ней будут удалены. Действие нельзя отменить.'}
                        </p>
                        <div className="popconfirm__actions">
                            <button
                                className="popconfirm__btn popconfirm__btn--secondary"
                                onClick={() => setConfirmAction(null)}
                            >
                                Отмена
                            </button>
                            <button
                                className="popconfirm__btn popconfirm__btn--danger"
                                onClick={() => {
                                    if (confirmAction.type === 'clear') {
                                        clearBasket(confirmAction.basketId);
                                    } else {
                                        removeBasket(confirmAction.basketId);
                                    }
                                    setConfirmAction(null);
                                }}
                            >
                                {confirmAction.type === 'clear' ? 'Очистить' : 'Удалить'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
