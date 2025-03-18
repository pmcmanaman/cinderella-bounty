/*
This server layout provides a shared header and basic structure for (marketing) routes.
*/

"use server"

import { Footer } from "@/components/landing/footer"
import Header from "@/components/landing/header"

export default async function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
