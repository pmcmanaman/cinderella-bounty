/*
This server page displays information about the company, mission, and team.
*/

"use server"

import { Card, CardContent } from "@/components/ui/card"

export default async function AboutPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-center text-4xl font-bold">About Us</h1>

      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-2xl font-semibold">Our Story</h2>
            <p className="text-muted-foreground">
              We are passionate about building tools that help people work
              smarter and achieve more. Our platform combines cutting-edge
              technology with intuitive design to create a seamless experience
              for our users.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-2xl font-semibold">Our Mission</h2>
            <p className="text-muted-foreground">
              Our mission is to empower individuals and organizations with
              innovative solutions that drive productivity and success. We
              believe in creating technology that adapts to how people work, not
              the other way around.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-2xl font-semibold">Core Values</h2>
            <ul className="text-muted-foreground list-inside list-disc space-y-2">
              <li>Innovation in everything we do</li>
              <li>Customer success is our success</li>
              <li>Transparency and trust</li>
              <li>Continuous improvement</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
