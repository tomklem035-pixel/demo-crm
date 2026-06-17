import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "Sheds CRM",
  description: "Sheds CRM",
};

const themeInitScript = `
(function(){try{
var t=localStorage.getItem('theme');
if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){
document.documentElement.classList.add('dark');
}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
