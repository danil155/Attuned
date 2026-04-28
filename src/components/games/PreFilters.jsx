import "./PreFilters.css";

// TODO: заменить на эндпоинт /platforms/ когда появится на бэке
export const PLATFORMS = [
    "PC",
    "PlayStation 5",
    "PlayStation 4",
    "Xbox Series X|S",
    "Xbox One",
    "Nintendo Switch",
    "macOS",
    "Linux",
    "iOS",
    "Android",
];

export const DEFAULT_PRE_FILTERS = {
    releasedOnly: true,
    platforms: [],
};

export function PreFilters({ filters, onChange }) {
    const togglePlatform = (p) => {
        const next = filters.platforms.includes(p)
            ? filters.platforms.filter((x) => x !== p)
            : [...filters.platforms, p];
        onChange({ ...filters, platforms: next });
    };

    const activeCount = [
        !filters.releasedOnly,
        filters.platforms.length > 0,
    ].filter(Boolean).length;

    return (
        <div className="pre-filters">
            <div className="pre-filters__head">
                <span className="pre-filters__label">
                    Параметры подбора
                    {activeCount > 0 && (
                        <span className="pre-filters__badge">{activeCount}</span>
                    )}
                </span>
                {activeCount > 0 && (
                    <button
                        className="pre-filters__reset"
                        onClick={() => onChange(DEFAULT_PRE_FILTERS)}
                    >
                        Сбросить
                    </button>
                )}
            </div>

            <div className="pre-filters__body">
                <label className="pf-toggle-row">
                    <span className="pf-toggle-text">
                        <span className="pf-toggle-title">Только вышедшие игры</span>
                        <span className="pf-toggle-sub">Исключить анонсы и игры в разработке</span>
                    </span>
                    <button
                        className={`toggle-switch ${filters.releasedOnly ? "toggle-switch--on" : ""}`}
                        onClick={() => onChange({ ...filters, releasedOnly: !filters.releasedOnly })}
                        role="switch"
                        aria-checked={filters.releasedOnly}
                    >
                        <span className="toggle-switch__thumb" />
                    </button>
                </label>

                <div className="pf-group">
                    <div className="pf-group__head">
                        <span className="pf-group__label">Платформы</span>
                        {filters.platforms.length > 0 && (
                            <button
                                className="pf-group__clear"
                                onClick={() => onChange({ ...filters, platforms: [] })}
                            >
                                сбросить
                            </button>
                        )}
                    </div>
                    <div className="pf-chips">
                        {PLATFORMS.map((p) => (
                            <button
                                key={p}
                                className={`pf-chip ${filters.platforms.includes(p) ? "pf-chip--active" : ""}`}
                                onClick={() => togglePlatform(p)}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    {filters.platforms.length === 0 && (
                        <p className="pf-hint">Не выбрано - подбираем по всем платформам</p>
                    )}
                </div>
            </div>
        </div>
    );
}
