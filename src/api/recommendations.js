import api from "./client";

export async function getRecommendations({
    preferences,
    seen_igdb_ids = [],
    platforms = [],
    niche = false,
    limit = 10,
    only_released = true
}) {
    const { data } = await api.post('/recommendations', {
        preferences,
        seen_igdb_ids,
        ...(platforms.length > 0 && { platforms }),
        ...(niche && { niche }),
        limit,
        ...(only_released && { only_released }),
    }, {
        withCredentials: true
    });

    return data;
}
