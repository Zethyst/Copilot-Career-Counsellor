import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Co-Pilot",
  description: "Your personal AI-powered career guidance assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <meta name="image" content="/login.png" />
        <meta name="whatsapp:image" content="/login.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider
            attribute="class" 
            defaultTheme="system" 
            enableSystem
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
