import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context";
import "./GameCard.css";

export function GameCard({ game, onDislike }) {
    const { baskets, addGameToBasket, limits, likeGame, dislikeGame, getInteraction } = useApp();

    const currentStatus = getInteraction(game.igdb_id);
    const liked = currentStatus === 'like';

    const [dismissed, setDismissed] = useState(false);
    const [basketMenuOpen, setBasketMenuOpen] = useState(false);
    const [addedTo, setAddedTo] = useState(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    const btnRef = useRef(null);
    const menuRef = useRef(null);
    const containerRef = useRef(null);
    const leaveTimeoutRef = useRef(null);

    useEffect(() => {
        if (!basketMenuOpen)
            return;

        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)
                && containerRef.current && !containerRef.current.contains(e.target)) {
                setBasketMenuOpen(false);

                if (leaveTimeoutRef.current)
                    clearTimeout(leaveTimeoutRef.current);
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [basketMenuOpen]);

    const handleMouseLeaveContainer = useCallback(() => {
        if (!basketMenuOpen) return;

        leaveTimeoutRef.current = setTimeout(() => {
            setBasketMenuOpen(false);
        }, 200);
    }, [basketMenuOpen]);

    const handleMouseEnterMenu = useCallback(() => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
    }, []);

    const handleMouseLeaveMenu = useCallback(() => {
        leaveTimeoutRef.current = setTimeout(() => {
            setBasketMenuOpen(false);
        }, 200);
    }, []);

    const updateMenuPosition = useCallback(() => {
        if (!btnRef.current)
            return;

        let top = 0
        let left = 0;

        setMenuPos({ top, left })
    }, []);

    const handleOpenMenu = useCallback(() => {
        if (basketMenuOpen) {
            setBasketMenuOpen(false);
            return;
        }

        updateMenuPosition();
        setBasketMenuOpen(true);
    }, [basketMenuOpen, updateMenuPosition]);

    useEffect(() => {
        if(basketMenuOpen)
            updateMenuPosition();
    }, [basketMenuOpen, updateMenuPosition]);

    useEffect(() => {
        return () => {
            if (leaveTimeoutRef.current)
                clearTimeout(leaveTimeoutRef.current);
        };
    }, []);

    const handleDislike = () => {
        const btn = document.activeElement;
        if (btn?.classList?.contains('action-btn--skip')) {
            btn.classList.add('action-btn--animate');
            setTimeout(() => btn.classList.remove('action-btn--animate'), 300);
        }

        dislikeGame(game.igdb_id, game);
        setDismissed(true);
        setTimeout(() => onDislike?.(game.igdb_id), 320);
    };

    const handleLike = () => {
        const btn = document.activeElement;
        if (btn?.classList?.contains('action-btn')) {
            btn.classList.add('action-btn--animate');
            setTimeout(() => btn.classList.remove('action-btn--animate'), 300);
        }

        likeGame(game.igdb_id, game);
    };

    const handleAddToBasket = (basketId) => {
        addGameToBasket(basketId, game);
        setAddedTo(basketId);

        const menuItem = document.activeElement;
        if (menuItem?.classList?.contains('basket-menu__item')) {
            menuItem.classList.add('basket-menu__item--added');
            setTimeout(() => menuItem.classList.remove('basket-menu__item--added'), 500);
        }

        setTimeout(() => {
            setBasketMenuOpen(false);
            setTimeout(() => setAddedTo(null), 300);
        }, 800);
    };

    const handleCardClick = (e) => {
        if (!e.target.closest('button')) {
            window.open(game.igdb_url, '_blank');
        }
    };

    return (
        <article
            className={`game-card ${dismissed ? "game-card--out" : ""}`}
            onClick={handleCardClick}
            style={{ cursor: 'pointer' }}
        >
            {game.match_percent != null && (
                <div className="game-card__match">
                    <span className="match-score">{game.match_percent}%</span>
                    <span className="match-label">совпадение</span>
                </div>
            )}

            <div className="game-card__cover-wrap">
                <div className="game-card__cover"
                     style={{ backgroundImage: game.cover_url ? `url(${game.cover_url})` : "none"}}
                >
                    {!game.cover_url && (
                        <span className="game-card__fallback">{game.name?.[0]}</span>
                    )}
                </div>

                {game.rating != null && (
                    <div className="game-card__rating">{game.rating}</div>
                )}
            </div>

            <div className="game-card__body">
                <h3 className="game-card__title">{game.name}</h3>

                {game.summary_small && <p className="game-card__reason">{game.summary_small}</p>}

                <div className="game-card__genres">
                    {(game.genres ?? []).slice(0, 3).map((g) => (
                        <span key={g} className="genre-pill">{g}</span>
                    ))}
                </div>

                <div className="game-card__footer">
                    <div className="basket-wrap"
                         ref={containerRef}
                         onMouseLeave={handleMouseLeaveContainer}
                    >
                        <button
                            ref={btnRef}
                            className={`btn-basket ${basketMenuOpen ? "btn-basket--hidden" : ""}`}
                            onClick={handleOpenMenu}
                            title="Добавить в коллекцию"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            В коллекцию
                        </button>

                        {basketMenuOpen && (
                            <div ref={menuRef}
                                 className="basket-menu"
                                 style={{
                                     top: menuPos.top,
                                     left: menuPos.left,
                                 }}
                                 onMouseEnter={handleMouseEnterMenu}
                                 onMouseLeave={handleMouseLeaveMenu}
                            >
                                {baskets.filter((b) => !b.isVirtual).map((b) => {
                                    const full = b.games.length >= limits.gamesPerBasket;
                                    const inIt = b.games.includes(game.igdb_id);
                                    const justAdded = addedTo === b.id;
                                    return (
                                        <button
                                            key={b.id}
                                            className={`basket-menu__item ${inIt ? "basket-menu__item--in" : ""} ${full ? "basket-menu__item--full" : ""} ${justAdded ? "basket-menu__item--added" : ""}`}
                                            onClick={() => !inIt && !full && handleAddToBasket(b.id)}
                                            disabled={inIt || full}
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                                {justAdded || inIt
                                                    ? <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    : <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                                }
                                            </svg>
                                            <span>{b.name}</span>
                                            <span className="basket-menu__cnt">
                                                {b.games.length}/{limits.gamesPerBasket}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="game-card__actions">
                        <button
                            className={`action-btn ${liked ? "action-btn--liked" : ""}`}
                            onClick={handleLike}
                            title="Нравится"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </button>
                        <button
                            className="action-btn action-btn--skip"
                            onClick={handleDislike}
                            title="Не интересно"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
