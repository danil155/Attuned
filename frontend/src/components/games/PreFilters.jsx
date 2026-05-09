import { useEffect, useState } from "react";
import { getPlatforms } from "../../api";
import { useError } from "../../context";
import "./PreFilters.css";

export const DEFAULT_PRE_FILTERS = {
    releasedOnly: true,
    niche: false,
    platforms: [],
};

export function PreFilters({ filters, onChange }) {
    const { showError } = useError();

    const [expandedCategories, setExpandedCategories] = useState({});
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadPlatforms = async () => {
            try {
                setLoading(true);
                const data = await getPlatforms();
                if (isMounted) {
                    setPlatforms(data);
                }
            } catch (error) {
                console.error('Failed to load platforms:', error);
                showError('Не смогли получить данные о платформах')
                if (isMounted) {
                    setPlatforms([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadPlatforms();

        return () => {
            isMounted = false;
        }
    }, []);

    const togglePlatform = (p) => {
        const next = filters.platforms.includes(p)
            ? filters.platforms.filter((x) => x !== p)
            : [...filters.platforms, p];
        onChange({ ...filters, platforms: next });
    };

    const toggleCategory = (cat) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    }

    const activeCount = [
        !filters.releasedOnly,
        filters.niche,
        filters.platforms.length > 0,
    ].filter(Boolean).length;

    if (loading) {
        return (
            <div className="pre-filters">
                <div className="pre-filters__head">
                    <span className="pre-filters__label">Параметры подбора</span>
                </div>
                <div className="pre-filters__body">
                    <div className="pf-group">
                        <div className="pf-group__head">
                            <span className="pf-group__label">Платформы</span>
                        </div>
                        <div className="pf-chips">
                            <div className="loading-skeleton">Загрузка платформ...</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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

                <label className="pf-toggle-row">
                    <span className="pf-toggle-text">
                        <span className="pf-toggle-title">Редкость</span>
                        <span className="pf-toggle-sub">Сосредоточить больше внимания на непопулярных проектах</span>
                    </span>
                    <button
                        className={`toggle-switch ${filters.niche ? "toggle-switch--on" : ""}`}
                        onClick={() => onChange({ ...filters, niche: !filters.niche })}
                        role="switch"
                        aria-checked={filters.niche}
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

                    {Object.entries(platforms).map(([category, { popular, rest }]) => {
                        const isExpanded = expandedCategories[category];
                        const visiblePlatforms = isExpanded ? [...popular, ...rest] : popular;

                        return (
                            <div key={category} className="pf-category">
                                <span className="pf-category__label">{category}</span>
                                <div className="pf-chips">
                                    {visiblePlatforms.map((p) => (
                                        <button
                                            key={p}
                                            className={`pf-chip ${filters.platforms.includes(p) ? "pf-chip--active" : ""}`}
                                            onClick={() => togglePlatform(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    {rest.length > 0 && (
                                        <button
                                            className="pf-chip pf-chip--expand"
                                            onClick={() => toggleCategory(category)}
                                        >
                                            {isExpanded ? "Скрыть" : `+${rest.length} ещё`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filters.platforms.length === 0 && (
                        <p className="pf-hint">Не выбрано - подбираем по всем платформам</p>
                    )}
                </div>
            </div>
        </div>
    );
}
