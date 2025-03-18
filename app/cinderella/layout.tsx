/**
 * @file layout.tsx (Server Component)
 * @description
 *   This file defines the primary layout for the "/cinderella" route.
 *   It wraps any nested pages/components under the Cinderella Bounty game section.
 *
 * @purpose
 *   - Provide a dedicated layout scope for the Cinderella Bounty features.
 *   - Potentially define UI elements (e.g., navigation, sidebars) specifically for Cinderella routes.
 *
 * @notes
 *   - Currently, this layout is minimal and simply renders its children.
 *   - Expand in the future with route-specific styling or navigation if needed.
 */

"use server"

interface CinderellaLayoutProps {
  children: React.ReactNode
}

export default async function CinderellaLayout({
  children
}: CinderellaLayoutProps) {
  return (
    <div className="bg-secondary/10 min-h-screen w-full">
      {/* 
        This div provides a subtle background distinct from the marketing pages.
        Future expansions may add route-specific headers, sidebars, or nav bars here. 
      */}
      {children}
    </div>
  )
}
