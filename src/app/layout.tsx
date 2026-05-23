import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "EducTask - Plataforma de Gestión Educativa",
  description: "Sistema de gestión educativa para instituciones escolares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}