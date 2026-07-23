import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";

// Archivo tem eixo de largura: esticado a 125 faz os numerais dos escalões e
// das balizas, como o "R X" do emblema; a 100 é o texto corrido.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// Só para horas, placards e etiquetas — números que têm de ficar quietos.
const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-martian",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Batalha de Guarda-Redes · RX Soccer Academy",
    template: "%s · Batalha de Guarda-Redes",
  },
  description: "Resultados ao vivo da Batalha de Guarda-Redes da RX Soccer Academy.",
  openGraph: {
    title: "Batalha de Guarda-Redes · RX Soccer Academy",
    description: "Resultados ao vivo",
    type: "website",
    locale: "pt_PT",
  },
  applicationName: "Batalha de Guarda-Redes",
  appleWebApp: { capable: true, title: "Batalha GR", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${archivo.variable} ${martian.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
