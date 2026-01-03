import { env } from 'next-runtime-env';

export const environment = {
    API_URL: env('NEXT_PUBLIC_Paper_Analysis_URL') || 'http://localhost:8000/api/v2',
    WS_URL: env('NEXT_PUBLIC_Paper_Analysis_WS') || 'ws://localhost:8000/api/v2/ws',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    mode: process.env.NODE_ENV,
    
    getWebSocketURL: (sessionId?: string, clientId?: string) => {
        const wsUrl = env('NEXT_PUBLIC_Paper_Analysis_WS') || 'ws://localhost:8000/api/v2/ws';
        const url = new URL(wsUrl);
        
        const session = sessionId || localStorage.getItem('sessionId') || crypto.randomUUID();
        url.searchParams.append('session_id', session);
        
        if (!localStorage.getItem('sessionId')) {
            localStorage.setItem('sessionId', session);
        }
        
        url.searchParams.append('client_id', clientId || crypto.randomUUID());
        
        return url.toString();
    }
};