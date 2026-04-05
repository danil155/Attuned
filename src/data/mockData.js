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

export const BASKET_LIMITS = {
    free: { baskets: 1, gamesPerBasket: 30 },
    pro:  { baskets: 5, gamesPerBasket: 50 },
};