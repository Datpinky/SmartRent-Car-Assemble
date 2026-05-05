const PLACEHOLDER_HOSTS = new Set([
    'cdn.example.com',
    'example.com',
    'www.example.com',
]);

const API_BASE_URL = (
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    'http://localhost:3000'
).replace(/\/+$/, '');

const hasHttpProtocol = (value) => /^https?:\/\//i.test(value);

export function sanitizeImageUrl(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';

    if (rawValue.startsWith('data:') || rawValue.startsWith('blob:')) {
        return rawValue;
    }

    if (hasHttpProtocol(rawValue)) {
        try {
            const parsedUrl = new URL(rawValue);
            if (PLACEHOLDER_HOSTS.has(parsedUrl.hostname)) {
                return '';
            }
            return parsedUrl.toString();
        } catch {
            return '';
        }
    }

    if (rawValue.startsWith('//')) {
        return '';
    }

    const normalizedPath = rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
    return `${API_BASE_URL}${normalizedPath}`;
}

export function sanitizeImageList(values = []) {
    return [...new Set(values.map(sanitizeImageUrl).filter(Boolean))];
}
