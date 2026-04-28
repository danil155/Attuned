import api from "./client";

export async function importSteamLibrary(token, steam_input, cart_id) {
    const { data } = await api.post('/steam/import', {
        steam_input,
        cart_id
    }, {
        headers: { 'x-token': token },
    });

    return data;
}
