import { useEffect, useState } from "react";
import { useBeforeUnload } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { sendFeedback } from "../../api";
import { useAuth, useError } from "../../context";
import { StyleEmoji } from "../../services/StyleEmoji";
import "./Feedback.css";

const FEEDBACK_TYPES = [
    { id: 'bug', label: 'Ошибка / Баг', icon: '🐞' },
    { id: 'idea', label: 'Идея / Улучшение', icon: '💡' },
    { id: 'impression', label: 'Общее впечатление', icon: '❤️' },
    { id: 'cooperation', label: 'Сотрудничество', icon: '🤝' },
];

const IMPORTANCE_OPTIONS = [
    { value: 1, label: 'Не мешает', emoji: '😌' },
    { value: 2, label: 'Слегка мешает', emoji: '😐' },
    { value: 3, label: 'Мешает', emoji: '😕' },
    { value: 4, label: 'Сильно мешает', emoji: '😫' },
    { value: 5, label: 'Удаляю интернет', emoji: '💀' },
];

const TYPE_FIELDS = {
    bug: {
        requires_summary: true,
        requires_description: true,
        requires_browser: true,
        requires_os: true,
        requires_external_id: true,
        requires_importance: true,
        description_placeholder: 'Опишите, что произошло. Какие действия привели к ошибке?',
        summary_placeholder: 'Например: В корзине не отображаются игры',
    },
    idea: {
        requires_summary: true,
        requires_description: true,
        requires_browser: false,
        requires_os: false,
        requires_external_id: false,
        requires_importance: false,
        description_placeholder: 'Опишите подробнее вашу идею. Как именно она должна работать?',
        summary_placeholder: 'Например: Добавить расширенные фильтры',
    },
    impression: {
        requires_summary: false,
        requires_description: true,
        requires_browser: false,
        requires_os: false,
        requires_external_id: false,
        requires_importance: false,
        description_placeholder: 'Здесь вы можете рассказать про свой опыт пользования',
    },
    cooperation: {
        requires_summary: false,
        requires_description: false,
        requires_company_name: true,
        requires_company_description: true,
        requires_contact: true,
        requires_browser: false,
        requires_os: false,
        requires_external_id: false,
        requires_importance: false,
        company_name_placeholder: 'Например: semiwork',
        company_description_placeholder: 'Расскажите о компании: чем занимаетесь, какие проекты делаете, почему хотите сотрудничать с Attuned?',
        contact_placeholder: 'Корпоративная почта или Telegram-бот компании'

    },
};

export default function Feedback() {
    const { user } = useAuth();
    const { showError } = useError();

    const [formData, setFormData] = useState({
        feedback_type: 'bug',
        summary: '',
        description: '',
        browser: '',
        os: '',
        external_id: '',
        importance: null,
        company_name: '',
        company_description: '',
        contact: '',
    });

    const [selectedType, setSelectedType] = useState('bug');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [isFormDirty, setIsFormDirty] = useState(false);

    const currentFields = TYPE_FIELDS[selectedType];

    useEffect(() => {
        const hasData =
            formData.summary?.trim() ||
            formData.description?.trim() ||
            formData.company_name?.trim() ||
            formData.company_description?.trim() ||
            formData.contact?.trim() ||
            formData.external_id?.trim() ||
            formData.importance !== null;

        setIsFormDirty(hasData);
    }, [formData])

    useBeforeUnload(
        (event) => {
            if (isFormDirty && !isSubmitted) {
                event.preventDefault();
            }
        },
        { capture: true }
    );

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            feedback_type: selectedType,
            browser: currentFields.requires_browser ? prev.browser : '',
            os: currentFields.requires_os ? prev.os : '',
            external_id: currentFields.requires_external_id ? prev.external_id : '',
            importance: currentFields.requires_importance ? prev.importance : null,
            company_name: currentFields.requires_company_name ? prev.company_name: '',
            company_description: currentFields.requires_company_description ? prev.company_description : '',
            contact: currentFields.requires_contact ? prev.contact : '',
        }));
    }, [currentFields.requires_browser, currentFields.requires_company_description, currentFields.requires_company_name, currentFields.requires_contact, currentFields.requires_external_id, currentFields.requires_importance, currentFields.requires_os, selectedType]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error)
            setError(null);
    };

    const handleTypeSelect = (typeId) => {
        setSelectedType(typeId);
    };

    const handleImportanceSelect = (value) => {
        setFormData((prev) => ({ ...prev, importance: value }));
    };

    const detectBrowserAndOS = () => {
        const ua = navigator.userAgent;

        let browser = 'Unknown';
        if (ua.includes('Chrome') && !ua.includes('Edg'))
            browser = 'Chrome';
        else if (ua.includes('Firefox'))
            browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome'))
            browser = 'Safari';
        else if (ua.includes('Edg'))
            browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('Opr'))
            browser = 'Opera';

        let os = 'Unknown';
        if (ua.includes('Windows'))
            os = 'Windows';
        else if (ua.includes('Mac'))
            os = 'macOS';
        else if (ua.includes('Linux'))
            os = 'Linux';
        else if (ua.includes('Android'))
            os = 'Android';
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad'))
            os = 'iOS';

        setFormData((prev) => ({
            ...prev,
            browser: browser,
            os: os,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (currentFields.summary && !formData.summary.trim()) {
            setError('Пожалуйста, кратко опишите суть');
            return;
        }
        if (currentFields.description && !formData.description.trim()) {
            setError('Пожалуйста, расскажите подробнее');
            return;
        }
        if (currentFields.requires_company_name && !formData.company_name.trim()) {
            setError('Пожалуйста, укажите название компании');
            return;
        }
        if (currentFields.requires_contact && !formData.contact.trim()) {
            setError('Пожалуйста, укажите контактные данные');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const payload = {
            feedback_type: formData.feedback_type,
            summary: formData.summary,
            description: formData.description,
        };

        if (currentFields.requires_browser && formData.browser) {
            payload.browser = formData.browser;
        }
        if (currentFields.requires_os && formData.os) {
            payload.os = formData.os;
        }
        if (currentFields.requires_external_id && formData.external_id) {
            payload.external_id = formData.external_id;
        }
        if (currentFields.requires_importance && formData.importance) {
            payload.importance = formData.importance;
        }
        if (currentFields.requires_company_name && formData.company_name) {
            payload.company_name = formData.company_name;
        }
        if (currentFields.requires_company_description && formData.company_description) {
            payload.company_description = formData.company_description;
        }
        if (currentFields.requires_contact && formData.contact) {
            payload.contact = formData.contact;
        }

        try {
            console.log(payload)
            await sendFeedback(payload);
            setIsSubmitting(true);
            setIsSubmitted(true);
        } catch (e) {
            console.error(e)

            if (e.response?.status === 429) {
                showError('Слишком много попыток. Попробуйте через час')
            } else {
                showError('Что-то пошло не по плану. Попробуйте позже')
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const fillPublicId = () => {
        if (user?.external_id) {
            setFormData((prev) => ({ ...prev, external_id: user.external_id }));
        }
    };

    const Tooltip = ({ children, text }) => {
        const [show, setShow] = useState(false);

        return (
            <span
                className="tooltip-trigger"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                <span className="tooltip-icon">?</span>
                {show && (
                    <span className="tooltip-bubble">
                        {text}
                    </span>
                )}
            </span>
        );
    };

    if (isSubmitted) {
        return (
            <motion.div
                className="feedback-success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
            >
                <div className="feedback-success__icon">🎉</div>
                <h2 className="feedback-success__title">Спасибо за обратную связь!</h2>
                <p className="feedback-success__text">
                    Вы помогаете сделать Attuned лучше. <br />
                    Мы обязательно рассмотрим ваше сообщение.
                </p>
                <button
                    className="feedback-success__btn"
                    onClick={() => (window.location.href = '/')}
                >
                    Вернуться на главную
                </button>
            </motion.div>
        );
    }

    return (
        <div className="feedback-page">
            <div className="feedback-container">
                <motion.div
                    className="feedback-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="feedback-header__glow" />
                    <div className="feedback-header__badge">💬 Обратная связь</div>
                    <h1 className="feedback-header__title">
                        Помогите нам стать <span className="feedback-header__accent">лучше</span>
                    </h1>
                    <p className="feedback-header__sub">
                        Вы - один из первых пользователей Attuned. Расскажите, что мы можем улучшить.
                    </p>
                </motion.div>

                <motion.form
                    className="feedback-form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {/* TYPE */}
                    <div className="form-group">
                        <label className="form-label">Тип обращения</label>
                        <div className="feedback-types">
                            {FEEDBACK_TYPES.map((type, idx) => (
                                <motion.button
                                    key={type.id}
                                    type="button"
                                    className={`feedback-type-btn ${selectedType === type.id ? "active" : ""}`}
                                    onClick={() => handleTypeSelect(type.id)}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <StyleEmoji
                                        emoji={type.icon}
                                        className="feedback-type-btn__icon"
                                        size="20px"
                                    />
                                    <span className="feedback-type-btn__label">{type.label}</span>
                                    {selectedType === type.id && (
                                        <motion.span
                                            className="feedback-type-btn__active-dot"
                                            layoutId="activeDot"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>


                    <AnimatePresence mode="wait">

                        <motion.div
                            key={selectedType}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                            {/* BRIEF ESSENCE */}
                            {currentFields.requires_summary && (
                                <div className="form-group">
                                    <label className="form-label">
                                        Краткая суть <span className="form-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="summary"
                                        className="form-input"
                                        placeholder={currentFields.summary_placeholder}
                                        value={formData.summary}
                                        onChange={handleChange}
                                        maxLength={200}
                                    />
                                    <div className="form-hint">
                                        {formData.summary.length}/200 символов
                                    </div>
                                </div>
                            )}

                            {/* DETAIL DESCRIPTION */}
                            {currentFields.requires_description && (
                                <div className="form-group">
                                    <label className="form-label">
                                        Подробное описание <span className="form-required">*</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        className="form-textarea"
                                        rows={5}
                                        placeholder={currentFields.description_placeholder}
                                        value={formData.description}
                                        onChange={handleChange}
                                        maxLength={2000}
                                    />
                                    <div className="form-hint">
                                        {formData.description.length}/2000 символов
                                    </div>
                                </div>
                            )}

                            {/* BROWSER AND DEVICE */}
                            {currentFields.requires_browser && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="form-row"
                                >
                                    <div className="form-group form-group--half">
                                        <label className="form-label">
                                            Браузер
                                            <Tooltip text="Браузер и ОС помогают нам воспроизвести ошибку. Эти данные необязательные, но очень помогают!" />
                                        </label>
                                        <input
                                            type="text"
                                            name="browser"
                                            className="form-input"
                                            placeholder="Chrome, Firefox, Safari..."
                                            value={formData.browser}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group form-group--half">
                                        <label className="form-label">
                                            Операционная система
                                        </label>
                                        <div className="os-input-wrapper">
                                            <input
                                                type="text"
                                                name="os"
                                                className="form-input"
                                                placeholder="Windows, macOS, Android..."
                                                value={formData.os}
                                                onChange={handleChange}
                                            />
                                            <button
                                                type="button"
                                                className="detect-btn"
                                                onClick={() => detectBrowserAndOS()}
                                                title="Определить автоматически"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* PUBLIC ID */}
                            {currentFields.requires_external_id && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="form-group"
                                >
                                    <label className="form-label">
                                        Public ID
                                        <Tooltip text="Если укажете ID, мы сможем быстрее разобраться в ситуации. Но это необязательно." />
                                    </label>
                                    <div className="external-id-wrapper">
                                        <input
                                            type="text"
                                            name="external_id"
                                            className="form-input"
                                            placeholder="Ваш public ID профиля"
                                            value={formData.external_id}
                                            onChange={handleChange}
                                        />
                                        {user?.external_id && (
                                            <button
                                                type="button"
                                                className="detect-btn"
                                                onClick={fillPublicId}
                                                title="Подставить мой Public ID"
                                            >
                                                👤
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* IMPORTANCE */}
                            {currentFields.requires_importance && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="form-group"
                                >
                                    <label className="form-label">Насколько это мешает?</label>
                                    <div className="importance-grid">
                                        {IMPORTANCE_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`importance-btn ${formData.importance === option.value ? "active" : ""}`}
                                                onClick={() => handleImportanceSelect(option.value)}
                                            >
                                                <StyleEmoji
                                                    emoji={option.emoji}
                                                    className="importance-btn__emoji"
                                                    size="30px"
                                                />
                                                <span className="importance-btn__label">{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* COOPERATION FIELDS */}
                            {currentFields.requires_company_name && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">
                                            Название компании <span className="form-required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="company_name"
                                            className="form-input"
                                            placeholder={currentFields.company_name_placeholder}
                                            value={formData.company_name}
                                            onChange={handleChange}
                                            maxLength={200}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Контактные данные <span className="form-required">*</span>
                                            <Tooltip text="Не передавайте личные контактные данные через эту форму! " />
                                        </label>
                                        <input
                                            type="text"
                                            name="contact"
                                            className="form-input"
                                            placeholder={currentFields.contact_placeholder}
                                            value={formData.contact}
                                            onChange={handleChange}
                                            maxLength={300}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Описание компании
                                        </label>
                                        <textarea
                                            name="company_description"
                                            className="form-textarea"
                                            rows={4}
                                            placeholder={currentFields.company_description_placeholder}
                                            value={formData.company_description}
                                            onChange={handleChange}
                                            maxLength={2000}
                                        />
                                        <div className="form-hint">
                                            {formData.company_description.length}/2000 символов
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {error && (
                        <motion.div
                            className="form-error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            ⚠️ {error}
                        </motion.div>
                    )}

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="btn-submit__spinner" />
                                    Отправка...
                                </>
                            ) : (
                                <>
                                    Отправить
                                </>
                            )}
                        </button>
                    </div>

                    <div className="form-footer">
                        <div className="form-footer__content">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>
                                Нажимая "Отправить", вы соглашаетесь с{" "}
                                <a
                                    href="/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    политикой конфиденциальности
                                </a>
                            </span>
                        </div>
                    </div>
                </motion.form>
            </div>
        </div>
    );
}
