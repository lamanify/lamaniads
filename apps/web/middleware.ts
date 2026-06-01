import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiPath = pathname.replace('/api', '');
    const targetUrl = `${backendUrl}${apiPath}${request.nextUrl.search}`;

    try {
      const headers = new Headers(request.headers);
      headers.delete('host');

      // Inject Supabase credentials for Edge Functions
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        headers.set('apikey', serviceRoleKey);
        headers.set('Authorization', `Bearer ${serviceRoleKey}`);
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('x-proxied-by', 'nextjs-middleware');

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return NextResponse.json(
        { error: 'Failed to proxy request to backend' },
        { status: 502 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
