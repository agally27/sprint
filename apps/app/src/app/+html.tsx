import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Root HTML for the static web build. Runs only on web, at export time.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="description" content="Sprint turns any goal into focused sprints that move you forward." />
        <meta name="theme-color" content="#0B0C10" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F7F6F2" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Sprint" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "html,body{height:100%;background:#0B0C10}@media (prefers-color-scheme: light){html,body{background:#F7F6F2}}body{overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}#root{display:flex;height:100%}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
