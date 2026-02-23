
export default function middleware(request) {
    // Middleware is active but currently passing through all requests.
    // This file is kept to maintain the edge runtime config and matcher rules.
    return;
}

export const config = {
    // Only apply to the most critical SEO landing pages
    matcher: ['/', '/signup', '/login', '/sitemap.xml', '/interview-room', '/interview-room/:path*', '/glossary', '/blog'],
};
