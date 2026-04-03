export const GAMES = [
    { id: 1,  title: "The Witcher 3: Wild Hunt",           genre: ["RPG", "Open World"],        year: 2015, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.webp" },
    { id: 2,  title: "Hollow Knight",                       genre: ["Metroidvania", "Indie"],     year: 2017, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wk8.webp" },
    { id: 3,  title: "Red Dead Redemption 2",               genre: ["Open World", "Action"],      year: 2018, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.webp" },
    { id: 4,  title: "Dark Souls III",                      genre: ["Soulslike", "RPG"],          year: 2016, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co21ms.webp" },
    { id: 5,  title: "Hades",                               genre: ["Roguelite", "Action"],       year: 2020, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7374.webp" },
    { id: 6,  title: "Sekiro: Shadows Die Twice",           genre: ["Soulslike", "Action"],       year: 2019, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1moo.webp" },
    { id: 7,  title: "Disco Elysium",                       genre: ["RPG", "Detective"],          year: 2019, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1sfj.webp" },
    { id: 8,  title: "Cyberpunk 2077",                      genre: ["RPG", "Open World"],         year: 2020, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4hk6.webp" },
    { id: 9,  title: "Elden Ring",                          genre: ["Soulslike", "Open World"],   year: 2022, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp" },
    { id: 10, title: "Stardew Valley",                      genre: ["Simulation", "RPG"],         year: 2016, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2ax9.webp" },
    { id: 11, title: "God of War",                          genre: ["Action", "Adventure"],       year: 2018, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.webp" },
    { id: 12, title: "Baldur's Gate 3",                     genre: ["RPG", "Turn-based"],         year: 2023, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6lyc.webp" },
    { id: 13, title: "Ori and the Blind Forest",            genre: ["Platformer", "Indie"],       year: 2015, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rn2.webp" },
    { id: 14, title: "Celeste",                             genre: ["Platformer", "Indie"],       year: 2018, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2bdi.webp" },
    { id: 15, title: "Monster Hunter: World",               genre: ["Action", "RPG"],             year: 2018, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r0n.webp" },
    { id: 16, title: "Divinity: Original Sin 2",            genre: ["RPG", "Turn-based"],         year: 2017, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2ybd.webp" },
    { id: 17, title: "Control",                             genre: ["Action", "Supernatural"],    year: 2019, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3dx3.webp" },
    { id: 18, title: "Outer Wilds",                         genre: ["Adventure", "Mystery"],      year: 2019, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1qbe.webp" },
    { id: 19, title: "Death Stranding",                     genre: ["Action", "Exploration"],     year: 2019, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1yxf.webp" },
    { id: 20, title: "Returnal",                            genre: ["Roguelite", "Shooter"],      year: 2021, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.webp" },
    { id: 21, title: "Bloodborne",                          genre: ["Soulslike", "RPG"],          year: 2015, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rc8.webp" },
    { id: 22, title: "The Last of Us Part I",               genre: ["Action", "Adventure"],       year: 2022, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5xek.webp" },
    { id: 23, title: "Persona 5 Royal",                     genre: ["RPG", "JRPG"],               year: 2020, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1ypd.webp" },
    { id: 24, title: "Undertale",                           genre: ["RPG", "Indie"],              year: 2015, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1e9y.webp" },
    { id: 25, title: "Doom Eternal",                        genre: ["Shooter", "Action"],         year: 2020, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1nc7.webp" },
];

export const STARTER_PACKS = [
    {
        id: "pack-rpg",
        name: "Любитель RPG",
        emoji: "⚔️",
        description: "Глубокие миры, прокачка и выборы",
        gameIds: [1, 7, 12, 16, 23],
    },
    {
        id: "pack-action",
        name: "Экшн и адреналин",
        emoji: "🔥",
        description: "Динамичный геймплей и зрелищные бои",
        gameIds: [4, 6, 9, 11, 25],
    },
    {
        id: "pack-indie",
        name: "Инди-первооткрыватель",
        emoji: "🎮",
        description: "Маленькие игры с большими идеями",
        gameIds: [2, 5, 13, 14, 24],
    },
    {
        id: "pack-story",
        name: "Нарратив прежде всего",
        emoji: "📖",
        description: "Истории, которые не забыть",
        gameIds: [3, 7, 18, 19, 22],
    },
    {
        id: "pack-chill",
        name: "Расслабиться",
        emoji: "🌿",
        description: "Без стресса, в своём ритме",
        gameIds: [10, 13, 18, 24, 2],
    },
    {
        id: "pack-challenge",
        name: "Хочу страдать",
        emoji: "💀",
        description: "Сложность как искусство",
        gameIds: [4, 6, 9, 21, 20],
    },
];

export const RECOMMENDATION_POOL = [
    { id: 101, title: "Blasphemous",                          genre: ["Metroidvania", "Soulslike"], year: 2019, rating: 84, matchScore: 97, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.webp", reason: "Тёмная атмосфера Dark Souls + механика Hollow Knight" },
    { id: 102, title: "Pathfinder: Wrath of the Righteous",   genre: ["RPG", "Turn-based"],         year: 2021, rating: 88, matchScore: 94, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2jk4.webp", reason: "Идеально для фанатов Baldur's Gate и Divinity" },
    { id: 103, title: "Nioh 2",                               genre: ["Soulslike", "Action"],        year: 2020, rating: 90, matchScore: 93, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2ekt.webp", reason: "Глубже и сложнее любой игры FromSoftware" },
    { id: 104, title: "Subnautica",                            genre: ["Survival", "Exploration"],   year: 2018, rating: 93, matchScore: 91, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2ekt.webp", reason: "Неповторимая атмосфера исследования и тревоги" },
    { id: 105, title: "Psychonauts 2",                         genre: ["Platformer", "Adventure"],   year: 2021, rating: 91, matchScore: 89, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2gv5.webp", reason: "Нарратив уровня Disco Elysium, но как платформер" },
    { id: 106, title: "Wasteland 3",                           genre: ["RPG", "Tactical"],           year: 2020, rating: 85, matchScore: 87, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1xyb.webp", reason: "Жёсткий пост-апок и тактическая глубина" },
    { id: 107, title: "Remnant II",                            genre: ["Soulslike", "Shooter"],      year: 2023, rating: 89, matchScore: 86, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6udv.webp", reason: "Соулслайк с огнестрельным оружием и кооперативом" },
    { id: 108, title: "Tunic",                                 genre: ["Adventure", "Puzzle"],       year: 2022, rating: 87, matchScore: 84, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4e1j.webp", reason: "Outer Wilds + Dark Souls — загадка внутри загадки" },
    { id: 109, title: "Lies of P",                             genre: ["Soulslike", "Action"],       year: 2023, rating: 86, matchScore: 83, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6p5p.webp", reason: "Лучший соулслайк не от FromSoftware" },
    { id: 110, title: "Hi-Fi Rush",                            genre: ["Action", "Rhythm"],          year: 2023, rating: 92, matchScore: 81, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6dn5.webp", reason: "Сочетание ритма и экшна — неожиданно и весело" },
    { id: 111, title: "Vampire Survivors",                     genre: ["Roguelite", "Indie"],        year: 2022, rating: 90, matchScore: 80, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.webp", reason: "Затягивает моментально, простая формула — бездонная глубина" },
    { id: 112, title: "Dave the Diver",                        genre: ["Adventure", "Simulation"],   year: 2023, rating: 91, matchScore: 79, cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6p77.webp", reason: "Инди-хит, который не похож ни на что другое" },
];

export function getRecommendations(count = 8) {
    const shuffled = [...RECOMMENDATION_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map((r) => ({
        ...r,
        matchScore: Math.floor(Math.random() * 15) + 82,
    }));
}

export const BASKET_LIMITS = {
    free: { baskets: 1, gamesPerBasket: 30 },
    pro:  { baskets: 5, gamesPerBasket: 50 },
};