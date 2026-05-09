import api from "./client";

export async function getPlatforms() {
    const { data } = await api.get('/platforms');

    return data;
}
