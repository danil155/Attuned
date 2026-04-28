import api from "./client";

export async function getRecommendations({
    liked_igdb_ids,
    disliked_igdb_ids = [],
    seen_igdb_ids = [],
    limit = 10,
    platforms = [],
    released_only = true
}) {
    const { data } = await api.post('/recommendations/', {
        liked_igdb_ids,
        disliked_igdb_ids,
        seen_igdb_ids,
        limit,
        ...(platforms.length > 0 && { platforms }),
        ...(released_only && { released_only }),
    });

    return data;
}
