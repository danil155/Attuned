import api from "./client";

export async function sendFeedback(message) {
    const { data } = await api.post('/feedback', message);

    return data;
}
