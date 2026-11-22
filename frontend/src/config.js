// Runtime configuration. Values come from REACT_APP_* environment variables at build time
// (see frontend/.env.example). Never put secrets here: everything in the bundle is public.
const stripTrailingSlash = (url) => url.replace(/\/+$/, '');

export const API_URL = stripTrailingSlash(process.env.REACT_APP_API_URL || 'http://localhost:5000');

// Build an absolute URL for a backend-served path such as "/uploads/photos/x.jpg".
export const assetUrl = (path) => (path ? `${API_URL}${path.startsWith('/') ? '' : '/'}${path}` : '');
