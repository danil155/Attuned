import {createContext, useContext, useState, useCallback, useEffect} from "react";
import {getGenres} from "../api";

const AppContext = createContext(null);
const GenresContext = createContext(null);

const DEFAULT_BASKET = { id: "basket-1", name: "Моя коллекция", games: [] };

const BASKET_LIMITS = {
    free: { baskets: 1, gamesPerBasket: 30 },
    pro:  { baskets: 5, gamesPerBasket: 50 },
};

export const STARTER_PACKS = [
    {
        id: "pack-rpg",
        name: "Любитель RPG",
        emoji: "⚔️",
        description: "Глубокие миры, прокачка и выборы",
        gameIds: [1942, 119171, 1877, 119133, 1887],
    },
    {
        id: "pack-action",
        name: "Экшн и адреналин",
        emoji: "🔥",
        description: "Динамичный геймплей и зрелищные бои",
        gameIds: [103298, 19560, 76253, 19565, 76882],
    },
    {
        id: "pack-indie",
        name: "Инди-первооткрыватель",
        emoji: "🎮",
        description: "Маленькие игры с большими идеями",
        gameIds: [113112, 14593, 11737, 26226, 40477],
    },
    {
        id: "pack-story",
        name: "Нарратив прежде всего",
        emoji: "📖",
        description: "Истории, которые не забыть",
        gameIds: [204350, 25076, 26472, 185246, 14362],
    },
    {
        id: "pack-chill",
        name: "Расслабиться",
        emoji: "🌿",
        description: "Без стресса, в своём ритме",
        gameIds: [17000, 203722, 115843, 138590, 7352],
    },
    {
        id: "pack-challenge",
        name: "Хочу страдать",
        emoji: "💀",
        description: "Тест на прочность твоей мышки",
        gameIds: [11133, 9061, 121752, 72373, 7334],
    },
];

export function GenresProvider({ children }) {
    const [genres, setGenres] = useState([]);

    useEffect(() => {
        getGenres().then(data => {
            setGenres(data);
        }).catch(error => {
            console.error('Failed to load genres:', error);
        });
    }, []);

    return <GenresContext.Provider value={{ genres }}>{children}</GenresContext.Provider>;
}

export function AppProvider({ children }) {
    const [isPro, setIsPro] = useState(false);
    const [baskets, setBaskets] = useState([DEFAULT_BASKET]);
    const [activeBasketId, setActiveBasketId] = useState("basket-1");
    const [pendingBasketId, setPendingBasketId] = useState(null);

    const limits = isPro ? BASKET_LIMITS.pro : BASKET_LIMITS.free;

    // КОРЗИНЫ

    const addBasket = useCallback((name) => {
        if (baskets.length >= limits.baskets)
            return false;

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

    // ИГРЫ В КОРЗИНЕ

    const addGameToBasket = useCallback((basketId, game) => {
        setBaskets((prev) => prev.map((b) => {
            if (b.id !== basketId)
                return b;

            if (b.games.length >= limits.gamesPerBasket)
                return b;

            if (b.games.find((g) => g.igdb_id === game.igdb_id))
                return b;

            return { ...b, games: [...b.games, game] };
        }));
    }, [limits.gamesPerBasket]);

    const removeGameFromBasket = useCallback((basketId, gameId) => {
        setBaskets((prev) => prev.map((b) =>
            b.id === basketId ? { ...b, games: b.games.filter((g) => g.igdb_id !== gameId) } : b
        ));
    }, []);

    const fillBasketFromPack = useCallback((basketId, games) => {
        setBaskets((prev) => prev.map((b) => {
            if (b.id !== basketId) return b;
            const existing = new Set(b.games.map((g) => g.igdb_id));
            const toAdd = games.filter((g) => !existing.has(g.igdb_id));
            const combined = [...b.games, ...toAdd].slice(0, limits.gamesPerBasket);
            return { ...b, games: combined };
        }));
    }, [limits.gamesPerBasket]);

    const getBasket = useCallback((id) => baskets.find((b) => b.id === id), [baskets]);

    // ПРОЧЕЕ

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

export function useGenres() {
    return useContext(GenresContext);
}
