export const metadata = {
  title: "Altudo Dashboard",
  description: "Executive dashboard with live Asana data",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
