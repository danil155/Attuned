import { useState } from "react";
import "./StarRating.css";

export default function StarRating({ value = 0, onChange }) {
    const [hovered, setHovered] = useState(null);

    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    className={`star ${(hovered ?? value) >= star ? "star--active" : ""}`}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onChange?.(star)}
                    aria-label={`Оценить ${star} из 5`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}