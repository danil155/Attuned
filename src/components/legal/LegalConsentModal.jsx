import { useState } from 'react';
import { Link } from 'react-router-dom';
import './LegalConsentModal.css';

export default function LegalConsentModal({ onAccept }) {
    const [isClosing, setIsClosing] = useState(false);

    const handleAccept = () => {
        setIsClosing(true);
        setTimeout(() => {
            localStorage.setItem('attuned_legal_accepted', 'true');
            onAccept();
        }, 350);
    };

    return (
        <div className="legal-consent-overlay">
            <div
                className={`legal-consent-container ${
                    isClosing ? 'legal-consent-container--closing' : ''
                }`}
            >
                <div className="legal-consent-modal">
                    <div className="lc-icon">📜</div>

                    <h2 className="lc-title">Пара формальностей</h2>

                    <p className="lc-desc">
                        Используя Attuned, вы принимаете условия наших документов.
                        Никаких ловушек - просто правила хорошего тона.
                    </p>

                    <div className="lc-links">
                        <Link
                            to="/terms"
                            target="_blank"
                            className="lc-link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            Пользовательское соглашение
                        </Link>
                        <Link
                            to="/privacy"
                            target="_blank"
                            className="lc-link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            Политика конфиденциальности
                        </Link>
                    </div>

                    <button className="lc-btn" onClick={handleAccept}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Принимаю
                    </button>

                    <p className="lc-hint">
                        Нажимая "Принимаю", вы соглашаетесь с документами выше
                    </p>
                </div>
            </div>
        </div>
    );
}
