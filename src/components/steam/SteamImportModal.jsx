import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { scanSteamLibrary, importSteamLibrary } from "../../api";
import wsService from "../../services/wsService";
import "./SteamImportModal.css";

export function SteamImportModal({ isOpen, onClose, cartId, cartName, onSuccess, currentGamesCount, gamesLimit }) {
    const [steamInput, setSteamInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [importing, setImporting] = useState(false);
    const [scannedGames, setScannedGames] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedIgdbIds, setSelectedIgdbIds] = useState(new Set());

    const availableSlots = gamesLimit - currentGamesCount;

    const filteredGames = useMemo(() => {
        if (!scannedGames?.games)
            return [];

        const query = searchQuery.toLowerCase().trim();
        if (!query)
            return scannedGames.games;

        return scannedGames.games.filter(game =>
            game.name.toLowerCase().includes(query)
        );
    }, [scannedGames, searchQuery]);

    const selectedCount = selectedIgdbIds.size;
    const canImport = selectedCount > 0 && selectedCount <= availableSlots;

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setSteamInput('');
                setScannedGames(null);
                setSelectedIgdbIds(new Set());
                setSearchQuery('');
                setError(null);
                setSelectAll(false);
            }, 300);
        }
    }, [isOpen]);

    useEffect(() => {
        if (scannedGames?.games) {
            const selectableGames = scannedGames.games.filter(g => g.matched && !g.already_in_cart);
            const gamesToSelect = selectableGames.slice(0, availableSlots);
            setSelectedIgdbIds(new Set(gamesToSelect.map(g => g.igdb_id)));
            setSelectAll(gamesToSelect.length === selectableGames.length && selectableGames.length > 0);
        }
    }, [scannedGames, availableSlots]);

    const handleScan = async () => {
        if (!steamInput.trim()) return;

        setScanning(true);
        setError(null);

        try {
            const result = await scanSteamLibrary(steamInput.trim(), cartId);
            setScannedGames(result);
            setSelectedIgdbIds(new Set());
            setSelectAll(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setScanning(false);
        }
    };

    const handleToggleGame = (game) => {
        setSelectedIgdbIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(game.igdb_id)) {
                newSet.delete(game.igdb_id);
            } else {
                if (newSet.size >= availableSlots) {
                    setError(`Нельзя выбрать больше ${availableSlots} игр (лимит корзины)`);
                    return prev;
                }
                newSet.add(game.igdb_id);
                setError(null);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIgdbIds(new Set());
        } else {
            const selectableGames = filteredGames.filter(g => g.matched && !g.already_in_cart);
            const gamesToSelect = selectableGames.slice(0, availableSlots);

            setSelectedIgdbIds(new Set(gamesToSelect.map(g => g.igdb_id)));
            setError(null);
        }
        setSelectAll(!selectAll);
    };

    const handleImport = async () => {
        try {
            const result = await importSteamLibrary(
                cartId,
                Array.from(selectedIgdbIds)
            );

            wsService.sync();

            if (onSuccess) {
                onSuccess(result);
            }

            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const modalVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    const contentVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 20 }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="steam-modal-overlay"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="steam-modal"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="steam-modal-header">
                            <h2>
                                Импорт из Steam
                            </h2>
                            <button className="steam-modal-close" onClick={onClose}>✕</button>
                        </div>

                        <div className="steam-modal-body">
                            {!scannedGames ? (
                                <>
                                    <p className="steam-modal-description">
                                        Введите ссылку на профиль Steam, Steam ID или vanity name
                                        <br />
                                        <strong>Важно:</strong> профиль должен быть открытым (публичным)
                                        <br /> <br />
                                        Импорт может быть некорректным! Функция в тестовом режиме
                                    </p>

                                    <div className="steam-input-group">
                                        <input
                                            type="text"
                                            className="steam-modal-input"
                                            placeholder="https://steamcommunity.com/id/username/ или steamid"
                                            value={steamInput}
                                            onChange={(e) => setSteamInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && steamInput.trim() && !scanning) {
                                                    handleScan();
                                                }
                                            }}
                                            disabled={scanning}
                                            autoFocus
                                        />
                                        <button
                                            className="steam-modal-scan-btn"
                                            onClick={handleScan}
                                            disabled={!steamInput.trim() || scanning}
                                        >
                                            {scanning ? (
                                                <>
                                                    <span className="btn-spinner-small" />
                                                    Сканирование...
                                                </>
                                            ) : (
                                                "Сканировать"
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="steam-scan-stats">
                                        <div className="steam-stats-card">
                                            <span className="steam-stats-number">{scannedGames.total_steam_games}</span>
                                            <span className="steam-stats-label">всего игр</span>
                                        </div>
                                        <div className="steam-stats-card">
                                            <span className="steam-stats-number">{scannedGames.matched}</span>
                                            <span className="steam-stats-label">найдено в базе</span>
                                        </div>
                                        <div className="steam-stats-card">
                                            <span className="steam-stats-number">{availableSlots}</span>
                                            <span className="steam-stats-label">свободно мест</span>
                                        </div>
                                    </div>

                                    {availableSlots <= 0 && (
                                        <div className="steam-warning">
                                            ⚠️ Корзина "{cartName}" заполнена. Удалите некоторые игры перед импортом.
                                        </div>
                                    )}

                                    <div className="steam-search-bar">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input
                                            type="text"
                                            className="steam-search-input"
                                            placeholder="Поиск игр..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <div className="steam-select-all-bar">
                                        <label className="steam-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectAll}
                                                onChange={handleSelectAll}
                                                disabled={availableSlots <= 0}
                                                className="steam-checkbox"
                                            />
                                            <span>Выбрать все найденные игры</span>
                                        </label>
                                        <span className="steam-selected-count">
                                            Выбрано: {selectedCount} / {availableSlots}
                                        </span>
                                    </div>

                                    <div className="steam-games-list">
                                        {filteredGames.length === 0 ? (
                                            <div className="steam-empty-search">
                                                {searchQuery ? 'Ничего не найдено' : 'Нет игр в библиотеке'}
                                            </div>
                                        ) : (
                                            filteredGames.map((game) => (
                                                <div
                                                    key={game.name}
                                                    className={`steam-game-item ${!game.matched ? 'unmatched' : ''} ${selectedIgdbIds.has(game.igdb_id) ? 'selected' : ''}`}
                                                >
                                                    <div className="steam-game-cover">
                                                        {game.cover_url ? (
                                                            <img src={game.cover_url} alt={game.name} />
                                                        ) : (
                                                            <span className="steam-game-cover-placeholder">
                                                                {game.name?.[0] || '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="steam-game-info">
                                                        <span className="steam-game-name">{game.name}</span>
                                                        {!game.matched && (
                                                            <span className="steam-game-badge unmatched-badge">
                                                                не найдена в базе
                                                            </span>
                                                        )}
                                                        {game.already_in_cart && (
                                                            <span className="steam-game-badge in-cart-badge">
                                                                уже в коллекции
                                                            </span>
                                                        )}
                                                    </div>
                                                    {game.matched && !game.already_in_cart && availableSlots > 0 && (
                                                        <label className="steam-game-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIgdbIds.has(game.igdb_id)}
                                                                onChange={() => handleToggleGame(game)}
                                                                disabled={selectedIgdbIds.size >= availableSlots && !selectedIgdbIds.has(game.igdb_id)}
                                                            />
                                                        </label>
                                                    )}
                                                    {(!game.matched || game.already_in_cart) && (
                                                        <div className="steam-game-disabled-icon">
                                                            {game.already_in_cart ? '✅' : '❌'}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="steam-modal-footer">
                            {error && (
                                <div className="steam-modal-error">
                                    <span>⚠️</span>
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="steam-modal-actions">
                                {scannedGames && (
                                    <button
                                        className="steam-modal-import"
                                        onClick={handleImport}
                                        disabled={!canImport || importing || availableSlots <= 0}
                                    >
                                        {importing ? (
                                            <>
                                                <span className="btn-spinner-small" />
                                                Импорт...
                                            </>
                                        ) : (
                                            `Импортировать (${selectedCount})`
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
