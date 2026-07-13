// Trailing slash stripped defensively — REACT_APP_API_BASE_URL is easy to
// paste with one, and a trailing slash here combined with the leading
// slash below produces a double-slash URL (".../api/auth") that some
// hosts/routers treat differently from the intended single-slash path.
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

export const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
export const ACADEMIC_API_URL = `${API_BASE_URL}/api/academics`;
