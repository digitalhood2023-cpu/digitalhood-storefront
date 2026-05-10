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
