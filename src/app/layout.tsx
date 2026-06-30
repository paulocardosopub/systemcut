import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "System Smart Cut",
  description: "Plataforma web para transformar videos longos em cortes inteligentes com IA."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
