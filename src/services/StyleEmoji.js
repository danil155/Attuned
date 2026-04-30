import data from 'emoji-datasource-apple'
import emojiUnicode from 'emoji-unicode'

export function StyleEmoji({ emoji, className = '', size = '1.2em' }) {
    const unicode = emojiUnicode(emoji).toUpperCase();
    const emojiData = data.find(item => item.unified === unicode)
    const imageUrl = emojiData
        ? `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/64/${emojiData.unified.toLowerCase()}.png`
        : null

    if (!imageUrl || !emoji)
        return <span className={className} style={{ fontsize: size }}>👤</span>

    return (
        <img
            src={imageUrl}
            alt={emoji}
            className={className}
            style={{
                width: size,
                height: size,
                verticalAlign: 'middle'
            }}
        />
    );
}
