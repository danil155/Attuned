const WS_URL = "wss://attuned.ru/ws/interactions";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT = 5;

class WsService {
    constructor() {
        this._ws = null;
        this._listeners = new Map();
        this._reconnects = 0;
        this._intentional = false;
    }

    connect() {
        if (this._ws && this._ws.readyState === WebSocket.OPEN)
            return;

        this._intentional = false;
        this._open();
    }

    disconnect() {
        this._intentional = true;
        this._ws?.close();
        this._ws = null;
    }

    async _open() {
        this._ws = new WebSocket(WS_URL);

        this._ws.onopen = async () => {
            this._reconnects = 0;
        };

        this._ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'auth_success') {
                    this.sync();
                }
                this._emit(msg.type, msg);
            } catch  { }
        };

        this._ws.onclose = () => {
            if (!this._intentional && this._reconnects < MAX_RECONNECT) {
                this._reconnects++;
                setTimeout(() => this._open(), RECONNECT_DELAY_MS);
            }
            this._emit('disconnected', {});
        };

        this._ws.onerror = () => {
            this._emit('error', {});
        };
    }

    _send(data) {
        if (this._ws?.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(data));
        }
    }

    like(igdb_id) {
        this._send({ action: 'like', igdb_id });
    }

    dislike(igdb_id) {
        this._send({ action: 'dislike', igdb_id });
    }

    removeInteraction(igdb_id) {
        this._send({ action: 'remove_interaction', igdb_id });
    }

    createCart(name) {
        this._send({ action: 'create_cart', name });
    }

    renameCart(cart_id, name) {
        this._send({ action: 'rename_cart', cart_id, name });
    }

    addToCart(cart_id, igdb_id) {
        this._send({ action: 'add_to_cart', cart_id, igdb_id });
    }

    removeFromCart(cart_id, igdb_id) {
        this._send({ action: 'remove_from_cart', cart_id, igdb_id });
    }

    clearCart(cart_id) {
        this._send({ action: 'clear_cart', cart_id });
    }

    deleteCart(cart_id) {
        this._send({ action: 'delete_cart', cart_id });
    }

    sync() {
        this._send({ action: 'sync' });
    }

    on(type, fn) {
        if (!this._listeners.has(type))
            this._listeners.set(type, new Set());

        this._listeners.get(type).add(fn);
        return () => this._listeners.get(type)?.delete(fn);
    }

    _emit(type, data) {
        this._listeners.get(type)?.forEach((fn) => fn(data));
        this._listeners.get("*")?.forEach((fn) => fn({ type, ...data }));
    }
}

const wsService = new WsService();
export default wsService;
