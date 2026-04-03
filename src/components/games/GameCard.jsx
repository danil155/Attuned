import { useState } from "react";
import StarRating from "../ui/StarRating";
import "./GameCard.css";

export default function GameCard({ game, rating = 0, onRate, onDislike }) {
    const [liked, setLiked] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const handleDislike = () => {
        setDismissed(true);
        setTimeout(() => onDislike?.(game.id), 320);
    };

    return (
        <article className={`game-card ${dismissed ? "game-card--out" : ""}`}>
            <div className="game-card__match">
                <span className="match-score">{game.matchScore}%</span>
                <span className="match-label">совпадение</span>
            </div>

            <div className="game-card__cover" style={{ backgroundImage: `url(${game.cover})` }}>
                <span className="game-card__cover-fallback">{game.title[0]}</span>
                <div className="game-card__rating-badge">{game.rating}</div>
            </div>

            <div className="game-card__body">
                <h3 className="game-card__title">{game.title}</h3>
                {game.reason && <p className="game-card__reason">{game.reason}</p>}

                <div className="game-card__genres">
                    {game.genre.map((g) => (
                        <span key={g} className="genre-pill">{g}</span>
                    ))}
                </div>

                <div className="game-card__footer">
                    <StarRating value={rating} onChange={(v) => onRate?.(game.id, v)} />
                    <div className="game-card__actions">
                        <button
                            className={`action-btn action-btn--like ${liked ? "action-btn--liked" : ""}`}
                            onClick={() => setLiked((v) => !v)}
                            title="Нравится"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </button>
                        <button className="action-btn action-btn--skip" onClick={handleDislike} title="Не интересно">
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