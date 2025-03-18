/*
This server page displays the main features and capabilities of the product.
*/

"use server"

import { Card, CardContent } from "@/components/ui/card"
import { BarChart, Clock, Settings, Shield, Users, Zap } from "lucide-react"

interface FeatureProps {
  title: string
  description: string
  icon: React.ReactNode
}

function Feature({ title, description, icon }: FeatureProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="bg-primary text-primary-foreground rounded-lg p-2">
          {icon}
        </div>
        <div>
          <h3 className="mb-2 font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function FeaturesPage() {
  const features: FeatureProps[] = [
    {
      title: "Lightning Fast",
      description:
        "Optimized performance for quick load times and smooth interactions.",
      icon: <Zap className="size-5" />
    },
    {
      title: "Enterprise Security",
      description:
        "Bank-grade encryption and security measures to protect your data.",
      icon: <Shield className="size-5" />
    },
    {
      title: "Customizable",
      description:
        "Flexible settings and configurations to match your workflow.",
      icon: <Settings className="size-5" />
    },
    {
      title: "Team Collaboration",
      description:
        "Built-in tools for seamless team coordination and communication.",
      icon: <Users className="size-5" />
    },
    {
      title: "Real-time Updates",
      description: "Stay synchronized with instant updates and notifications.",
      icon: <Clock className="size-5" />
    },
    {
      title: "Advanced Analytics",
      description:
        "Comprehensive insights and reporting to track your progress.",
      icon: <BarChart className="size-5" />
    }
  ]

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-center text-4xl font-bold">Features</h1>
      <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-center">
        Discover the powerful features that make our platform the perfect
        solution for your needs.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Feature key={index} {...feature} />
        ))}
      </div>
    </div>
  )
}
