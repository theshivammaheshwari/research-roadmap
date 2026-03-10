import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Research Roadmap — Smart Literature Review Tool',
  description:
    'Find, organize, and plan your PhD literature review. Search scholarly papers by topic, get reading methodology, categorized results, and download links. Powered by OpenAlex.',
  keywords: [
    'research papers',
    'literature review',
    'PhD',
    'academic search',
    'OpenAlex',
    'paper finder',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark-mode flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
