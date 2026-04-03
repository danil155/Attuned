import { createContext, useContext, useState, useCallback } from "react";
import { BASKET_LIMITS } from "../data/mockData";

const AppContext = createContext(null);

const DEFAULT_BASKET = { id: "basket-1", name: "Моя коллекция", games: [] };

export function AppProvider({ children }) {
    const [isPro, setIsPro] = useState(false);
    const [baskets, setBaskets] = useState([DEFAULT_BASKET]);
    const [activeBasketId, setActiveBasketId] = useState("basket-1");
    const [pendingBasketId, setPendingBasketId] = useState(null); // корзина, из которой запущен подбор

    const limits = isPro ? BASKET_LIMITS.pro : BASKET_LIMITS.free;

    // ── Корзины ──────────────────────────────────────────

    const addBasket = useCallback((name) => {
        if (baskets.length >= limits.baskets) return false;
        const id = `basket-${Date.now()}`;
        setBaskets((prev) => [...prev, { id, name, games: [] }]);
        setActiveBasketId(id);
        return true;
    }, [baskets, limits.baskets]);

    const removeBasket = useCallback((id) => {
        setBaskets((prev) => {
            const next = prev.filter((b) => b.id !== id);
            if (activeBasketId === id && next.length > 0) setActiveBasketId(next[0].id);
            return next;
        });
    }, [activeBasketId]);

    const renameBasket = useCallback((id, name) => {
        setBaskets((prev) => prev.map((b) => b.id === id ? { ...b, name } : b));
    }, []);

    // ── Игры в корзине ────────────────────────────────────

    const addGameToBasket = useCallback((basketId, game) => {
        setBaskets((prev) => prev.map((b) => {
            if (b.id !== basketId) return b;
            if (b.games.length >= limits.gamesPerBasket) return b;
            if (b.games.find((g) => g.id === game.id)) return b;
            return { ...b, games: [...b.games, game] };
        }));
    }, [limits.gamesPerBasket]);

    const removeGameFromBasket = useCallback((basketId, gameId) => {
        setBaskets((prev) => prev.map((b) =>
            b.id === basketId ? { ...b, games: b.games.filter((g) => g.id !== gameId) } : b
        ));
    }, []);

    const fillBasketFromPack = useCallback((basketId, games) => {
        setBaskets((prev) => prev.map((b) => {
            if (b.id !== basketId) return b;
            const existing = new Set(b.games.map((g) => g.id));
            const toAdd = games.filter((g) => !existing.has(g.id));
            const combined = [...b.games, ...toAdd].slice(0, limits.gamesPerBasket);
            return { ...b, games: combined };
        }));
    }, [limits.gamesPerBasket]);

    const getBasket = useCallback((id) => baskets.find((b) => b.id === id), [baskets]);

    // ── Разное ────────────────────────────────────────────

    const value = {
        isPro,
        setIsPro,
        baskets,
        limits,
        activeBasketId,
        setActiveBasketId,
        pendingBasketId,
        setPendingBasketId,
        addBasket,
        removeBasket,
        renameBasket,
        addGameToBasket,
        removeGameFromBasket,
        fillBasketFromPack,
        getBasket,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used inside AppProvider");
    return ctx;
}