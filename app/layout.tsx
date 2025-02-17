import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from 'react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Ziuch Tools",
    description: "文献查询、LaTeX 公式识别等在线工具集",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh" suppressHydrationWarning>
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
                    integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
                    crossOrigin="anonymous"
                />
            </head>
            <body className={`${inter.className} flex min-h-screen flex-col`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Navbar />
                    <main className="flex-1">
                        <Suspense fallback={<div>加载中...</div>}>
                            {children}
                        </Suspense>
                    </main>
                    <Toaster />
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
