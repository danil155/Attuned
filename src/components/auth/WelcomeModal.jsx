import { useState } from "react";
import {generateAccount, getMe, loginByToken} from "../../api";
import { useAuth, useError } from "../../context";
import { StyleEmoji } from "../../services/StyleEmoji";
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
    'МАТАДОРА!',
    'МУСЯ, ЭТО ТЫ?',
    'СЛЫШУ ШОРОХ...'
]

const getRandomPhrase = () => {
    const randomIndex = Math.floor(Math.random() * welcomePhrases.length);

    return welcomePhrases[randomIndex];
}

export default function WelcomeModal() {
    const { setUser } = useAuth();
    const { showError } = useError();

    const [view, setView] = useState('welcome');
    const [pasteValue, setPasteValue] = useState('');
    const [pasteError, setPasteError] = useState('');
    const [generating, setGenerating] = useState(false);
    const [newToken, setNewToken] = useState(null);
    const [randomTitle] = useState(() => getRandomPhrase());
    const [revealToken, setRevealToken] = useState(null);

    const [isAnimating, setIsAnimating] = useState(false);
    const [animationDirection, setAnimationDirection] = useState(null);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const data = await generateAccount();

            setRevealToken(data.access_token);
            setView('reveal');
        } catch (e) {
            console.error(e);

            if (e.response?.status === 429) {
                showError('Слишком много попыток. Попробуйте через час')
            } else {
                showError('Не удалось сгенерировать аккаунт')
            }
        } finally {
            setGenerating(false);
        }
    };

    const handlePaste = async () => {
        const t = pasteValue.trim();
        if (!t) {
            setPasteError('Вставьте токен');
            return;
        }
        if (t.length < 16) {
            setPasteError('Токен слишком короткий');
            return;
        }

        try {
            await loginByToken(t);

            const userData = await getMe();

            setUser(userData);
        } catch (err) {
            setPasteError('Неверный токен');
        }
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

    if (view === 'reveal') {
        return (
            <TokenRevealModal
                token={revealToken}
                onClose={() => {
                    getMe().then(setUser);
                }}
            />
        );
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
                                    <StyleEmoji
                                        className="wm-feature__icon"
                                        emoji="🔒"
                                    />
                                    <div>
                                        <p className="wm-feature__title">Без привычной регистрации</p>
                                        <p className="wm-feature__sub">Никакой почты и паролей - только токен доступа, который ты сам хранишь.</p>
                                    </div>
                                </div>
                                <div className="wm-feature">
                                    <StyleEmoji
                                        className="wm-feature__icon"
                                        emoji="🎮"
                                    />
                                    <div>
                                        <p className="wm-feature__title">250 000+ игр в базе</p>
                                        <p className="wm-feature__sub">Инди, AAA, ретро - мы знаем все.</p>
                                    </div>
                                </div>
                                <div className="wm-feature">
                                    <StyleEmoji
                                        className="wm-feature__icon"
                                        emoji="📦"
                                    />
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
                                        : ''
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
                                    onChange={(e) => { setPasteValue(e.target.value); setPasteError(''); }}
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
