import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ToastProvider } from './context/ToastContext';

export const metadata: Metadata = {
  title: 'ECMMS - Sistem Management & Monitoring PKWT Karyawan',
  description: 'Enterprise HR Portal untuk pemantauan dan pengelolaan jatuh tempo kontrak kerja karyawan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light">
      <body className="antialiased font-sans">
        <AuthProvider>
          <UIProvider>
            <ToastProvider>{children}</ToastProvider>
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
