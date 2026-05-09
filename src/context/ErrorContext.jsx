import { createContext, useCallback, useContext, useState } from 'react';
import { ErrorToast } from "../components/error";

const ErrorContext = createContext(null);

export const ErrorProvider = ({ children }) => {
    const [errorMessage, setErrorMessage] = useState(null);

    const showError = useCallback((message) => {
        if (message?.response?.data?.detail) {
            setErrorMessage(message.response.data.detail);
        }
        else if (message?.response?.data?.message) {
            setErrorMessage(message.response.data.message);
        }
        else if (typeof message === 'string') {
            setErrorMessage(message);
        }
        else if (message?.message) {
            setErrorMessage(message.message);
        }
        else {
            setErrorMessage('Произошла неизвестная ошибка. Попробуйте позже.');
        }
    }, []);

    const hideError = useCallback(() => {
        setErrorMessage(null);
    }, []);

    return (
        <ErrorContext.Provider value={{ showError, hideError }}>
            {children}
            <ErrorToast message={errorMessage} onClose={hideError} />
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    return useContext(ErrorContext);
};
