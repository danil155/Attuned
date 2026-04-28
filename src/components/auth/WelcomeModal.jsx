import { useState } from "react";
import { generateAccount } from "../../api";
import { useAuth } from "../../context/AuthContext";
import TokenRevealModal from "./TokenRevealModal";
import logo from "../../assets/AttunedLogo512.png";
import "./WelcomeModal.css";

const welcomePhrases = [
    'ПРИВЕТ!',
    'УРА, ТЫ ТОЖЕ ТУТ!',
    'ТИХОНЕЧКО...',
    'ЧАЙ, КОФЕ, ИГРЫ?',
    'НЕ ЧЕТО НЕ ХОЧУ...',
    'ЭТО НЕ ВАЙЛБЕРИЗ',
    'А ТОЧНО НАДО?',
    'ОПЯТЬ ТЫ...',
    'ЖДАЛИ-ЖДАЛИ',
    'ПОТЕРЯЛСЯ?',
    'МАТАДОРА!'
]

const getRandomPhrase = () => {
    const randomIndex = Math.floor(Math.random() * welcomePhrases.length);

    return welcomePhrases[randomIndex];
}

export default function WelcomeModal() {
    const { saveToken } = useAuth();

    const [view, setView] = useState("welcome");
    const [pasteValue, setPasteValue] = useState("");
    const [pasteError, setPasteError] = useState("");
    const [generating, setGenerating] = useState(false);
    const [newToken, setNewToken] = useState(null);
    const [randomTitle] = useState(() => getRandomPhrase());

    const [isAnimating, setIsAnimating] = useState(false);
    const [animationDirection, setAnimationDirection] = useState(null);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const data = await generateAccount();
            setNewToken(data.access_token);
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    const handleTokenRevealClose = () => {
        if (newToken) {
            saveToken(newToken);
            setNewToken(null);
        }
    };

    const handlePaste = () => {
        const t = pasteValue.trim();
        if (!t) {
            setPasteError('Вставьте токен');
            return;
        }
        if (t.length < 16) {
            setPasteError('Токен слишком короткий');
            return;
        }

        saveToken(t);
    };

    const transitionToView = (newView, direction) => {
        if (isAnimating)
            return;

        setAnimationDirection(direction);
        setIsAnimating(true);

        setTimeout(() => {
            setView(newView);
            setPasteError('');
            setIsAnimating(false);
            setAnimationDirection(null);
        }, 350);
    };

    const handleHaveTokenClick = () => {
        transitionToView('paste', 'left');
    };

    const handleBack = () => {
        transitionToView('welcome', 'right');
    };

    if (newToken) {
        return <TokenRevealModal token={newToken} onClose={handleTokenRevealClose} />;
    }

    const isWelcome = view === 'welcome';

    return (
        <div className="modal-overlay">
            <div className={`modal-container ${isAnimating ? `modal-container--leave-${animationDirection}` : ''}`}>
                <div className="welcome-modal">
                    <div className="wm-logo">
                        <img src={logo} width={64} height={64} alt="ATTUNED Logo" />
                        <span className="wm-logo__name">ATTUNED</span>
                    </div>

                    {isWelcome && (
                        <>
                            <h1 className="wm-title">{randomTitle}</h1>
                            <p className="wm-desc">
                                Attuned - персональный подборщик видеоигр. Выбери любимые игры,
                                и мы найдём то, что тебе понравится.
                            </p>

                            <div className="wm-features">
                                <div className="wm-feature">
                                    <span className="wm-feature__icon">🔒</span>
                                    <div>
                                        <p className="wm-feature__title">Без привычной регистрации</p>
                                        <p className="wm-feature__sub">Никакой почты и паролей - только токен доступа, который ты сам хранишь.</p>
                                    </div>
                                </div>
                                <div className="wm-feature">
                                    <span className="wm-feature__icon">🎮</span>
                                    <div>
                                        <p className="wm-feature__title">250 000+ игр в базе</p>
                                        <p className="wm-feature__sub">Инди, AAA, ретро - мы знаем все.</p>
                                    </div>
                                </div>
                                <div className="wm-feature">
                                    <span className="wm-feature__icon">📦</span>
                                    <div>
                                        <p className="wm-feature__title">Коллекции игр</p>
                                        <p className="wm-feature__sub">Собирай подборки и получай рекомендации на их основе.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="wm-actions">
                                <button
                                    className="wm-btn wm-btn--primary"
                                    onClick={handleGenerate}
                                    disabled={generating}
                                >
                                    {generating
                                        ? <span className="btn-spinner-small" />
                                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                                    }
                                    {generating ? "Создаем аккаунт..." : "Сгенерировать аккаунт"}
                                </button>
                                <button
                                    className="wm-btn wm-btn--ghost"
                                    onClick={handleHaveTokenClick}
                                >
                                    У меня уже есть токен
                                </button>
                            </div>
                        </>
                    )}

                    {!isWelcome && (
                        <>
                            <button
                                className="wm-back"
                                onClick={handleBack}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                                </svg>
                                Назад
                            </button>
                            <h1 className="wm-title">Войти по токену</h1>
                            <p className="wm-desc">Вставь свой токен доступа, чтобы восстановить аккаунт.</p>

                            <div className="wm-paste-wrap">
                                <input
                                    className={`wm-paste-input ${pasteError ? "wm-paste-input--error" : ""}`}
                                    placeholder="Вставь токен сюда..."
                                    value={pasteValue}
                                    onChange={(e) => { setPasteValue(e.target.value); setPasteError(""); }}
                                    onKeyDown={(e) => e.key === "Enter" && handlePaste()}
                                    autoFocus
                                />
                                {pasteError && <p className="wm-paste-error">{pasteError}</p>}
                            </div>

                            <div className="wm-actions">
                                <button
                                    className="wm-btn wm-btn--primary"
                                    onClick={handlePaste}
                                    disabled={!pasteValue.trim()}
                                >
                                    Войти
                                </button>
                            </div>

                            <p className="wm-paste-hint">
                                Если токен утерян - можно сгенерировать новый аккаунт, но старые данные будут недоступны.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
