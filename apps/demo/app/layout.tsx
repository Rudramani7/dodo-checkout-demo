import "./globals.css";
export const metadata = { title: "Dodo Checkout Demo" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}