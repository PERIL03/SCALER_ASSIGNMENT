import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AppToastProvider from "@/components/AppToastProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata = {
  title: "cal.com Scheduler",
  description: "Scheduling platform assignment project",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <AppToastProvider>{children}</AppToastProvider>
      </body>
    </html>
  );
}
