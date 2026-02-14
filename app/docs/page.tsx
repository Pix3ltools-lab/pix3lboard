'use client';

import Script from 'next/script';

export default function DocsPage() {
  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <div id="swagger-ui" style={{ minHeight: '100vh', background: '#fff' }} />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-expect-error SwaggerUIBundle loaded from CDN
          window.SwaggerUIBundle({
            url: '/api/docs',
            dom_id: '#swagger-ui',
          });
        }}
      />
    </>
  );
}
