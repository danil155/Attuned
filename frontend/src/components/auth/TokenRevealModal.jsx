import { useState } from "react";
import "./TokenRevealModal.css";

export default function TokenRevealModal({ token, onClose }) {
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(token).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const handleClose = () => {
        if (!confirmed)
            return;

        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 350);
    };

    return (
        <div className="token-overlay">
            <div className={`token-modal-container ${isClosing ? 'token-modal-container--closing' : ''}`}>
                <div className="token-modal">
                    <div className="tm-icon">🔑</div>
                    <h2 className="tm-title">Токен создан!</h2>
                    <p className="tm-desc">
                        Это твой токен доступа. Он показывается <strong>только один раз</strong> - сохрани его в надёжное место.
                    </p>

                    <div className="tm-token-wrap">
                        <code className="tm-token">{token}</code>
                        <button className={`tm-copy ${copied ? "tm-copy--done" : ""}`} onClick={handleCopy}>
                            {copied
                                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></>
                                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></>
                            }
                        </button>
                    </div>

                    <div className="tm-warning">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                        </svg>
                        <p>Если потеряешь токен - доступ к аккаунту и коллекциям восстановить не получится.</p>
                    </div>

                    <label className="tm-confirm">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                        />
                        <span>Я сохранил токен в надёжное место</span>
                    </label>

                    <button
                        className={`tm-btn ${!confirmed ? "tm-btn--disabled" : ""}`}
                        onClick={handleClose}
                        disabled={!confirmed}
                    >
                        Начать пользоваться
                    </button>
                </div>
            </div>
        </div>
    );
}
