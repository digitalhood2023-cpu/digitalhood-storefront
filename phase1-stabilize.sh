#!/bin/bash
set -e

mkdir -p src/lib src/components

cat > src/lib/site.ts <<'EOF'
export const SITE = {
  name: 'DigitalHood',
  title: 'DigitalHood Zambia | Phones, Laptops, Accessories & Repairs',
  description:
    "Shop phones, laptops, accessories, repairs and trusted tech services in Zambia. DigitalHood is building Zambia's most reliable online marketplace.",
  url: 'https://store.digitalhood.info',
  productionUrl: 'https://digitalhood.info',
  phone: '+260 971 047 570',
  locale: 'en_ZM',
  currency: 'ZMW',
  socialImage: '/logo.jpg',
};

export type SeoConfig = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
};
EOF

cat > src/components/SEO.tsx <<'EOF'
import { useEffect } from 'react';
import { SITE, type SeoConfig } from '@/lib/site';

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  let element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!element) {
    element = selector.startsWith('link') ? document.createElement('link') : document.createElement('meta');
    const match = selector.match(/\[(name|property|rel)="([^"]+)"\]/);
    if (match) element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attr, value);
}

export default function SEO({ title, description, path = '/', image, noindex = false }: SeoConfig) {
  useEffect(() => {
    const finalTitle = title ? `${title} | ${SITE.name}` : SITE.title;
    const finalDescription = description || SITE.description;
    const finalUrl = new URL(path, SITE.url).toString();
    const finalImage = new URL(image || SITE.socialImage, SITE.url).toString();

    document.title = finalTitle;
    setMeta('meta[name="description"]', 'content', finalDescription);
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex,nofollow' : 'index,follow');
    setMeta('link[rel="canonical"]', 'href', finalUrl);
    setMeta('meta[property="og:title"]', 'content', finalTitle);
    setMeta('meta[property="og:description"]', 'content', finalDescription);
    setMeta('meta[property="og:url"]', 'content', finalUrl);
    setMeta('meta[property="og:image"]', 'content', finalImage);
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:locale"]', 'content', SITE.locale);
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', finalTitle);
    setMeta('meta[name="twitter:description"]', 'content', finalDescription);
    setMeta('meta[name="twitter:image"]', 'content', finalImage);
  }, [title, description, path, image, noindex]);

  return null;
}
EOF

cat > src/components/ErrorBoundary.tsx <<'EOF'
import React from 'react';
import { SITE } from '@/lib/site';

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('DigitalHood frontend error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
        <div className="max-w-lg text-center">
          <img src="/logo.jpg" alt="DigitalHood" className="mx-auto h-16 w-16 object-contain mb-6" />
          <h1 className="text-3xl font-bold text-black mb-3">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            The storefront failed to load correctly. Please refresh the page, or contact DigitalHood support if it continues.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="rounded-full bg-black px-6 py-3 text-white font-semibold" onClick={() => window.location.reload()}>
              Refresh page
            </button>
            <a className="rounded-full border border-gray-300 px-6 py-3 font-semibold" href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
              Call support
            </a>
          </div>
        </div>
      </main>
    );
  }
}
EOF
