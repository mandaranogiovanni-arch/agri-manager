import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agri Shop',
  description: 'Ordina prodotti agricoli freschi',
  manifest: '/manifest-shop.json',
}

export const viewport = {
  themeColor: '#16a34a',
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}