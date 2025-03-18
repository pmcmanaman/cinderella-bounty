/*
This client page provides the login form from Clerk.
*/

"use client"

import { SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"

export default function LoginPage() {
  const { theme } = useTheme()

  return (
    <SignIn
      forceRedirectUrl="/"
      appearance={{ baseTheme: theme === "dark" ? dark : undefined }}
    />
  )
}
