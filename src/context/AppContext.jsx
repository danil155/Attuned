import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {getGenres} from "../api";
import {useAuth} from "./AuthContext";
import wsService from "../services/wsService";

const AppContext = createContext(null);
const GenresContext = createContext(null);

const BASKET_LIMITS = {
    free: { baskets: 1, gamesPerBasket: 30 },
    pro:  { baskets: 5, gamesPerBasket: 50 },
};

export const LIKES_BASKET_ID = '__likes__';
export const DISLIKES_BASKET_ID = '__dislikes__';

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
    const { user } = useAuth();

    const isPro = user?.is_pro ?? false;
    const limits = isPro ? BASKET_LIMITS.pro : BASKET_LIMITS.free;

    const [carts, setCarts] = useState([]);
    const [activeBasketId, setActiveBasketId] = useState(LIKES_BASKET_ID);
    const [interactions, setInteractions] = useState(new Map());

    const likesBasket = useMemo(() => {
        const games = [];
        const gameObjects = [];
        interactions.forEach(({ status, game }, igdb_id) => {
            if (status === 'like') {
                games.push(igdb_id);
                if (game)
                    gameObjects.push(game);
            }
        });

        return {
            id: LIKES_BASKET_ID,
            name: 'Мне нравится',
            isVirtual: true,
            games,
            _gameObjects: gameObjects
        };
    }, [interactions]);

    const dislikesBasket = useMemo(() => {
        const games = [];
        const gameObjects = [];
        interactions.forEach(({ status, game }, igdb_id) => {
            if (status === 'dislike') {
                games.push(igdb_id);
                if (game) gameObjects.push(game);
            }
        });

        return {
            id: DISLIKES_BASKET_ID,
            name: 'Мои дизлайки',
            isVirtual: true,
            games,
            _gameObjects: gameObjects,
        };
    }, [interactions]);

    const baskets = useMemo(
        () => [likesBasket, dislikesBasket, ...carts],
        [likesBasket, dislikesBasket, carts]
    );

    // SUBSCRIPTIONS

    useEffect(() => {
        const offs = [
            wsService.on('sync_state', (msg) => {
                const gamesMap = new Map();
                (msg.games || []).forEach(game => {
                    gamesMap.set(game.igdb_id, game);
                });

                const incoming = (msg.carts ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    games: c.games ?? [],
                    _gameObjects: (c.games ?? [])
                        .map(id => gamesMap.get(id))
                        .filter(game => game !== undefined)
                }));

                setCarts(incoming);
                setActiveBasketId((prev) => {
                    if (prev !== LIKES_BASKET_ID && prev !== DISLIKES_BASKET_ID)
                        return prev;

                    return prev;
                });

                const map = new Map();
                (msg.interactions ?? []).forEach((i) => {
                    if (i.status && i.status !== 'None') {
                        const gameData = i.game || gamesMap.get(i.igdb_id);
                        map.set(i.igdb_id, {
                            status: i.status,
                            game: gameData || null
                        });
                    }
                });
                setInteractions(map);
            }),

            wsService.on('cart_created', (msg) => {
                const cart = {
                    id: msg.cart.id,
                    name: msg.cart.name,
                    games: msg.cart.games ?? [],
                    _gameObjects: []
                };

                setCarts((prev) => [...prev, cart]);
                setActiveBasketId(cart.id);
            }),

            wsService.on('update', (msg) => {
                if (msg.target === 'cart') {
                    setCarts((prev) => applyCartUpdate(prev, msg));
                }
                if (msg.target === 'interaction') {
                    setInteractions((prev) => {
                        const next = new Map(prev);
                        if (!msg.status || msg.status === 'None')
                            next.delete(msg.igdb_id);
                        else {
                            const existing = prev.get(msg.igdb_id);
                            const gameData = msg.game || existing?.game || null;
                            next.set(msg.igdb_id, {
                                status: msg.status,
                                game: gameData
                            });
                        }

                        return next;
                    });
                }
            }),
        ];

        return () => offs.forEach((off) => off());
    }, []);

    // CARTS

    const addBasket = useCallback((name) => {
        if (carts.length >= limits.baskets)
            return false;

        wsService.createCart(name);

        return true;
    }, [carts.length, limits.baskets]);

    const removeBasket = useCallback((id) => {
        wsService.deleteCart(id);
        setCarts((prev) => {
            const next = prev.filter((b) => b.id !== id);
            setActiveBasketId((cur) => cur === id ? (next[0]?.id ?? LIKES_BASKET_ID) : cur);

            return next;
        });
    }, []);

    const renameBasket = useCallback((id, name) => {
        wsService.renameCart(id, name);
        setCarts((prev) => prev.map((b) => b.id === id ? { ...b, name } : b));
    }, []);

    const clearBasket = useCallback((basketId) => {
        if (basketId === LIKES_BASKET_ID || basketId === DISLIKES_BASKET_ID) {
            return;
        }

        wsService.clearCart(basketId);
        setCarts((prev) => prev.map((b) =>
            b.id === basketId
                ? { ...b, games: [], _gameObjects: [] }
                : b
        ));
    }, []);

    // GAME IN CART

    const addGameToBasket = useCallback((basketId, game) => {
        setCarts((prev) => {
            const basket = prev.find((b) => b.id === basketId);
            if (!basket)
                return prev;
            if (basket.games.length >= limits.gamesPerBasket)
                return prev;
            if (basket.games.includes(game.igdb_id))
                return prev;

            wsService.addToCart(basketId, game.igdb_id);

            return prev.map((b) => b.id === basketId ? {
                ...b,
                games: [...b.games, game.igdb_id],
                _gameObjects: [...(b._gameObjects ?? []), game],
            } : b);
        });
    }, [limits.gamesPerBasket]);

    const removeGameFromBasket = useCallback((basketId, igdb_id) => {
        if (basketId === LIKES_BASKET_ID || basketId === DISLIKES_BASKET_ID) {
            wsService.removeInteraction(igdb_id);
            setInteractions((prev) => {
                const m = new Map(prev);
                m.delete(igdb_id);
                return m;
            });

            return;
        }

        wsService.removeFromCart(basketId, igdb_id);
        setCarts((prev) => prev.map((b) => b.id === basketId ? {
            ...b,
            games: b.games.filter((id) => id !== igdb_id),
            _gameObjects: (b._gameObjects ?? []).filter((g) => g.igdb_id !== igdb_id),
            } : b));
    }, []);

    const fillBasketFromPack = useCallback((basketId, games) => {
        setCarts((prev) => {
            const basket = prev.find((b) => b.id === basketId);
            if (!basket)
                return prev;

            const existing = new Set(basket.games);
            const toAdd = games.filter((g) => !existing.has(g.igdb_id))
                .slice(0, limits.gamesPerBasket - basket.games.length);
            toAdd.forEach((g) => wsService.addToCart(basketId, g.igdb_id));

            return prev.map((b) => b.id === basketId ? {
                ...b,
                games: [...b.games, ...toAdd.map((g) => g.igdb_id)],
                _gameObjects: [...(b._gameObjects ?? []), ...toAdd],
            } : b);
        });
    }, [limits.gamesPerBasket]);

    const getBasket = useCallback((id) => baskets.find((b) => b.id === id), [baskets]);

    // INTERACTION

    const likeGame = useCallback((igdb_id, game = null) => {
        wsService.like(igdb_id);
        setInteractions((prev) => {
            const next = new Map(prev);
            next.set(igdb_id, { status: 'like', game: game ?? prev.get(igdb_id)?.game ?? null });

            return next;
        });
    }, []);

    const dislikeGame = useCallback((igdb_id, game = null) => {
        wsService.dislike(igdb_id);
        setInteractions((prev) => {
            const next = new Map(prev);
            next.set(igdb_id, { status: 'dislike', game: game ?? prev.get(igdb_id)?.game ?? null });

            return next;
        });
    }, []);

    const removeInteraction = useCallback((igdb_id) => {
        wsService.removeInteraction(igdb_id);
        setInteractions((prev) => {
            const m = new Map(prev);
            m.delete(igdb_id);
            return m;
        })
    }, []);

    const getInteraction = useCallback((igdb_id) => {
        return interactions.get(igdb_id)?.status ?? null;
    }, [interactions]);

    const value = {
        isPro, limits,
        baskets, carts, activeBasketId, setActiveBasketId,
        interactions,
        addBasket, removeBasket, renameBasket, clearBasket,
        addGameToBasket, removeGameFromBasket, fillBasketFromPack, getBasket,
        likeGame, dislikeGame, removeInteraction, getInteraction,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}

export function useGenres() {
    return useContext(GenresContext);
}

function applyCartUpdate(baskets, msg) {
    switch (msg.action) {
        case 'rename':
            return baskets.map((b) => b.id === msg.cart_id
                ? { ...b, name: msg.name ?? b.name }
                : b);
        case 'added':
            return baskets.map((b) => b.id === msg.cart_id && !b.games.includes(msg.igdb_id)
                ? {
                ...b,
                    games: [...b.games, msg.igdb_id],
                    _gameObjects: b._gameObjects
            }
            : b);
        case 'removed':
            return baskets.map((b) => b.id === msg.cart_id
                ? {
                ...b,
                    games: b.games.filter((id) => id !== msg.igdb_id),
                    _gameObjects: (b._gameObjects ?? []).filter((g) => g.igdb_id !== msg.igdb_id)
            }
            : b);
        case 'cleared':
            return baskets.map((b) => b.id === msg.cart_id
                ? { ...b, games: [], _gameObjects: [] }
                : b);
        case 'deleted':
            return baskets.filter((b) => b.id !== msg.cart_id);
        default:
            return baskets;
    }
}
