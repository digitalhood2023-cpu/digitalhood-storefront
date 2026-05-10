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
