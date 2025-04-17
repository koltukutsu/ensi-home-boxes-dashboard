import { AuthProvider } from '@/context/auth-context';
import { VisitProvider } from '@/context/visit-context';
import { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/registry/new-york-v4/ui/sonner';
import PlausibleProvider from 'next-plausible';
import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';

export default function App({ Component, pageProps }: AppProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;
    
    // Log page view when route changes
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_path: pathname,
        page_title: document.title,
        page_location: window.location.href
      });
    }
  }, [pathname, searchParams]);

  return (
    <>
      {/* <Script
        defer
        data-domain="ochtarcus-client.vercel.app" 
        src="/js/script.js"
        strategy="afterInteractive"
      /> */}
      {/* <PlausibleProvider domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'ochtarcus-client.vercel.app'}> */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <VisitProvider>
              <Component {...pageProps} />
              <Toaster />
            </VisitProvider>
          </AuthProvider>
        </ThemeProvider>
      {/* </PlausibleProvider> */}
    </>
  );
}