import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import ReduxProvider from "@/components/providers/ReduxProvider";

import "@/assets/styles/bootstrap.css";
import "@/assets/styles/app.css";
import "@/assets/styles/card.css";
import "@/assets/styles/footer.css";
import "@/assets/styles/swiper.css";
import "@/assets/styles/dropdown.css";
import "@/assets/styles/modal.css";
import "@/assets/styles/toast.css";
import "@/assets/styles/read.css";
import "@/assets/styles/reader-ux.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "tippy.js/dist/tippy.css";
import "tippy.js/dist/svg-arrow.css";

export const metadata: Metadata = {
  title: "MangaFire - Read Manga Online Free",
  description: "Free read manga online in high quality. No ads.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0e1726" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,700;1,600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
        <link href="/assets/fonts/css/fontawesome.min.css" rel="stylesheet" />
        <link href="/assets/fonts/css/solid.min.css" rel="stylesheet" />
        <link href="/assets/fonts/css/regular.min.css" rel="stylesheet" />
        <link href="/assets/fonts/css/brands.min.css" rel="stylesheet" />
      </head>
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
        <Toaster position="bottom-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW Registered');
                  }).catch(function(err) {
                    console.log('SW Failed', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
