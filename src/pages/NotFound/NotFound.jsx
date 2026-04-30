import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { StyleEmoji } from "../../services/StyleEmoji";
import './NotFound.css';

const Reasons = [
    'Эта страница ушла играть в инди-хоррор и сошла с ума от страха',
    'Ты нажал не туда. Или туда. Но страницы тут нет',
    'Страница в раннем доступе. Обещают добавить позже',
    'Ты открыл секретный уровень... В котором ничего нет',
    'Страница уехала на скилл-чек. И провалилась',
    'Разработчик забыл запятулю в коде. Извини',
    'Ушла за хлебом в 2005 году. Ее уже никто не ждет',
    'Хочу новый Chevrolet Tahoe. Пожалуйста',
    'Эта страница такая же реальная, как твоя девушка из другого города',
    'Тут смысла не больше, чем в твоем третьем высшем образовании... Или первом',
    'Тут ничего нет, но ты можешь посидеть и подумать над своим поведением',
    'Тут ничего нет, но ты продолжай обновлять. Вдруг твоя жизнь изменится',
    'Тут пусто. Можешь закрыть вкладку, мы оба знаем, что ты здесь ничего не найдешь',
    'Ты пытаешься найти здесь что-то полезное, как будто это исправит твой день'
];

function getRandomReason() {
    return Reasons[Math.floor(Math.random() * Reasons.length)];
}

export default function NotFound() {
    const [reason] = useState(() => getRandomReason());
    const [glitchText, setGlitchText] = useState('404');
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsGlitching(true);
            const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
            let result = '';
            for (let i = 0; i < 3; i++) {
                result += Math.random() > 0.5
                    ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
                    : ['4', '0', '4'][i];
            }
            setGlitchText(result);

            setTimeout(() => {
                setGlitchText('404');
                setIsGlitching(false);
            }, 120);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="not-found">
            <div className="not-found__glow" />
            <div className="not-found__glow not-found__glow--secondary" />

            <div className="not-found__content">
                <h1
                    className={`not-found__code ${isGlitching ? 'not-found__code--glitch' : ''}`}
                    data-text={glitchText}
                >
                    {glitchText}
                </h1>

                <p className="not-found__title">СТРАНИЦА НЕ НАЙДЕНА</p>
                <p className="not-found__reason">{reason}</p>

                <div className="not-found__emojis">
                    <StyleEmoji emoji="🎮" className="not-found__emoji not-found__emoji--left" size="56px"/>
                    <StyleEmoji emoji="💀" className="not-found__emoji not-found__emoji--center" size="56px" />
                    <StyleEmoji emoji="👾" className="not-found__emoji not-found__emoji--right" size="56px" />
                </div>

                <Link to="/" className="not-found__btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                    Вернуться домой
                </Link>

                <p className="not-found__hint">
                    Или попробуй найти что-то интересное в рекомендациях
                </p>
            </div>
        </div>
    );
}
