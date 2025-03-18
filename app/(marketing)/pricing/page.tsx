/*
This server page displays pricing options for the product, integrating Stripe payment links.
*/

"use server"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { auth } from "@clerk/nextjs/server"
import { Check } from "lucide-react"

export default async function PricingPage() {
  const { userId } = await auth()

  const features = [
    "All core features",
    "Priority support",
    "Advanced analytics",
    "Custom integrations",
    "API access",
    "Team collaboration"
  ]

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground">
          Choose the plan that best fits your needs. All plans include a 14-day
          free trial.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
        <PricingCard
          title="Monthly Plan"
          price="$10"
          description="Perfect for individuals and small teams"
          buttonText="Subscribe Monthly"
          buttonLink={
            process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || "#"
          }
          features={features}
          userId={userId}
          popular={false}
        />
        <PricingCard
          title="Yearly Plan"
          price="$100"
          description="Save 17% with annual billing"
          buttonText="Subscribe Yearly"
          buttonLink={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY || "#"}
          features={features}
          userId={userId}
          popular={true}
        />
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        All prices are in USD. Need a custom plan?{" "}
        <a href="/contact" className="font-medium underline underline-offset-4">
          Contact us
        </a>
      </p>
    </div>
  )
}

interface PricingCardProps {
  title: string
  price: string
  description: string
  buttonText: string
  buttonLink: string
  features: string[]
  userId: string | null
  popular: boolean
}

function PricingCard({
  title,
  price,
  description,
  buttonText,
  buttonLink,
  features,
  userId,
  popular
}: PricingCardProps) {
  const finalButtonLink = userId
    ? `${buttonLink}?client_reference_id=${userId}`
    : buttonLink

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col",
        popular && "border-primary shadow-lg"
      )}
    >
      {popular && (
        <div className="bg-primary text-primary-foreground absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-medium">
          Most Popular
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="grow">
        <div className="mb-6 flex items-baseline justify-center gap-x-2">
          <span className="text-5xl font-bold">{price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-x-2">
              <Check className="text-primary size-4" />
              <span className="text-muted-foreground text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className={cn(
            "w-full",
            popular && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          asChild
        >
          <a
            href={finalButtonLink}
            className={cn(
              "inline-flex items-center justify-center",
              finalButtonLink === "#" && "pointer-events-none opacity-50"
            )}
          >
            {buttonText}
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
