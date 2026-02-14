'use client';

import { useEffect } from 'react';

export default function DocsPage() {
  useEffect(() => {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      // @ts-expect-error SwaggerUIBundle loaded from CDN
      window.SwaggerUIBundle({
        url: '/api/docs',
        dom_id: '#swagger-ui',
      });
    };
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
    };
  }, []);

  return <div id="swagger-ui" style={{ minHeight: '100vh', background: '#fff' }} />;
}
