import { useState } from "react";
import "./RecsFilters.css";

export const DEFAULT_FILTERS = {
    releasedOnly: false,
    minRating: 0,
    genres: [],
    platforms: [],
};

const MIN_RATING_OPTIONS = [
    { label: 'Любой', value: 0 },
    { label: '60+',   value: 60 },
    { label: '70+',   value: 70 },
    { label: '80+',   value: 80 },
    { label: '90+',   value: 90 },
];

export function RecsFilters({ genres = [], platforms = [], filters, onChange }) {
    const [open, setOpen] = useState(false);

    const toggleGenre = (g) => {
        const next = filters.genres.includes(g)
            ? filters.genres.filter((x) => x !== g)
            : [...filters.genres, g];
        onChange({ ...filters, genres: next });
    };

    const togglePlatform = (p) => {
        const next = filters.platforms.includes(p)
            ? filters.platforms.filter((x) => x !== p)
            : [...filters.platforms, p];
        onChange({ ...filters, platforms: next });
    };

    const activeCount = [
        filters.releasedOnly,
        filters.minRating > 0,
        filters.genres.length > 0,
        filters.platforms.length > 0,
    ].filter(Boolean).length;

    const reset = () => onChange(DEFAULT_FILTERS);

    return (
        <div className="recs-filters">
            <button
                className={`filters-toggle ${open ? "filters-toggle--open" : ""} ${activeCount > 0 ? "filters-toggle--active" : ""}`}
                onClick={() => setOpen((v) => !v)}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61z" />
                </svg>
                Фильтры
                {activeCount > 0 && <span className="filters-badge">{activeCount}</span>}
                <svg
                    className={`filters-chevron ${open ? "filters-chevron--up" : ""}`}
                    width="13" height="13" viewBox="0 0 24 24" fill="currentColor"
                >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
            </button>

            {open && (
                <div className="filters-panel">
                    <div className="filters-row">

                        <label className="filter-toggle-row">
                            <span className="filter-toggle-label">Только вышедшие игры</span>
                            <button
                                className={`toggle-switch ${filters.releasedOnly ? "toggle-switch--on" : ""}`}
                                onClick={() => onChange({ ...filters, releasedOnly: !filters.releasedOnly })}
                                role="switch"
                                aria-checked={filters.releasedOnly}
                            >
                                <span className="toggle-switch__thumb" />
                            </button>
                        </label>

                        <div className="filter-group">
                            <p className="filter-group__label">Минимальный рейтинг</p>
                            <div className="filter-chips">
                                {MIN_RATING_OPTIONS.map((o) => (
                                    <button
                                        key={o.value}
                                        className={`filter-chip ${filters.minRating === o.value ? "filter-chip--active" : ""}`}
                                        onClick={() => onChange({ ...filters, minRating: o.value })}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {genres.length > 0 && (
                        <div className="filter-group">
                            <p className="filter-group__label">
                                Жанры
                                {filters.genres.length > 0 && (
                                    <button className="filter-clear-inline" onClick={() => onChange({ ...filters, genres: [] })}>
                                        сбросить
                                    </button>
                                )}
                            </p>
                            <div className="filter-chips filter-chips--wrap">
                                {genres.map((g) => (
                                    <button
                                        key={g}
                                        className={`filter-chip ${filters.genres.includes(g) ? "filter-chip--active" : ""}`}
                                        onClick={() => toggleGenre(g)}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {platforms.length > 0 && (
                        <div className="filter-group">
                            <p className="filter-group__label">
                                Платформы
                                {filters.platforms.length > 0 && (
                                    <button className="filter-clear-inline" onClick={() => onChange({ ...filters, platforms: [] })}>
                                        сбросить
                                    </button>
                                )}
                            </p>
                            <div className="filter-chips filter-chips--wrap">
                                {platforms.map((p) => (
                                    <button
                                        key={p}
                                        className={`filter-chip ${filters.platforms.includes(p) ? "filter-chip--active" : ""}`}
                                        onClick={() => togglePlatform(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeCount > 0 && (
                        <button className="filters-reset" onClick={reset}>
                            Сбросить все фильтры
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
