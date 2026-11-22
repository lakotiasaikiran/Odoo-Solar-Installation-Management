import "./globals.css";

export const metadata = {
  icons: { icon: "/brand/photonix-emblem.webp" },
  title: { default: "Photonix Solar", template: "%s | Photonix Solar" },
  description: "Professional rooftop solar installation management — from enquiry to warranty.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@600;700;800&family=Inter:ital,opsz,wght@0,14..32,300..800;1,14..32,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
