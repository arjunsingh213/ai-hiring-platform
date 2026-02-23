import { next } from '@vercel/edge';

export default function middleware(request) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';

    // High-performance regex for detecting crawler bots
    const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|discordbot/i.test(ua);

    // Only intercept the root landing page and public routes to avoid breaking internal app functionality
    const isPublicRoute = url.pathname === '/' || url.pathname.startsWith('/signup') || url.pathname.startsWith('/login');

    if (isBot && isPublicRoute) {
        // Rewrite to a pre-rendering service (Rendertron or similar)
        // This allows bots to see a static version of the JS-heavy landing page
        return fetch(`https://render-tron.appspot.com/render/${url.href}`);
    }

    return next();
}

export const config = {
    // Only apply to the most critical SEO landing pages
    matcher: ['/', '/signup', '/login', '/sitemap.xml'],
};
