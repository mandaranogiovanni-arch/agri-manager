import type { Metadata } from 'next'
import './globals.css'
import AuthGate from './AuthGate'
import AppShell from './AppShell'

export const metadata: Metadata = {
  title: 'Agri Manager',
  description: 'Gestionale agricolo',
  manifest: '/manifest-manager.json',
}

export const viewport = {
  themeColor: '#16a34a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it">
      <head>
        <link rel="manifest" href="/manifest-manager.json" />
        <meta name="theme-color" content="#16a34a" />
      </head>
      <body className="bg-gray-50 text-gray-900">
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </body>
    </html>
  )
}