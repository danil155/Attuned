import api from "./client";

export async function searchGames(q, limit = 20) {
    const { data } = await api.get('/games/search', {
        params: { q, limit },
    });

    return data;
}

export async function searchGamesByIds(ids) {
    const {data} = await api.get('/games/search_by_ids', {
        params: { igdb_ids: ids.join(',') }
    });

    return data;
}

export async function getPopularGames(limit = 10) {
    const { data } = await api.get('/games/popular', {
        params: { limit },
    });

    return data;
}
