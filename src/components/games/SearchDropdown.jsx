import { useState, useEffect, useRef } from "react";
import { GAMES } from "../../data/mockData";
import "./SearchDropdown.css";

export default function SearchDropdown({ excludeIds = [], onSelect, placeholder = "Найди игру…", disabled = false }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    const results = query.length >= 2
        ? GAMES.filter(
            (g) =>
                g.title.toLowerCase().includes(query.toLowerCase()) &&
                !excludeIds.includes(g.id)
        ).slice(0, 7)
        : [];

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = (game) => {
        onSelect(game);
        setQuery("");
        setOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className="sd-wrap" ref={wrapRef}>
            <div className={`sd-box ${open ? "sd-box--focused" : ""}`}>
                <svg className="sd-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                    ref={inputRef}
                    className="sd-input"
                    placeholder={placeholder}
                    value={query}
                    disabled={disabled}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                />
                {query && (
                    <button className="sd-clear" onClick={() => setQuery("")} aria-label="Очистить">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                )}
            </div>

            {open && query.length >= 2 && (
                <div className="sd-dropdown">
                    {results.length === 0 ? (
                        <p className="sd-empty">Игра не найдена</p>
                    ) : (
                        results.map((g) => (
                            <button key={g.id} className="sd-item" onClick={() => handleSelect(g)}>
                                <div className="sd-cover" style={{ backgroundImage: `url(${g.cover})` }}>
                                    <span>{g.title[0]}</span>
                                </div>
                                <div className="sd-info">
                                    <span className="sd-title">{g.title}</span>
                                    <span className="sd-meta">{g.genre.join(" · ")} · {g.year}</span>
                                </div>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="sd-arrow">
                                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                                </svg>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}