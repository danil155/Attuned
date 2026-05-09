import api from "./client";


export async function scanSteamLibrary(steamInput, cartId){
    const { data } = await api.post('/steam/scan', {
        steam_input: steamInput,
        cart_id: cartId
    }, {
        withCredentials: true
    });

    return data;
}

export async function importSteamLibrary(cartId, selectedIgdbIds) {
    const { data } = await api.post('/steam/import', {
        cart_id: cartId,
        selected_igdb_ids: selectedIgdbIds
    }, {
        withCredentials: true
    });

    return data;
}
