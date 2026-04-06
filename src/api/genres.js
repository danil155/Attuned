import api from "./client";

export async function getGenres() {
    const { data } = await api.get('/genres/');

    return data;
}
