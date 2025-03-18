/*
This server page displays a contact form for users to get in touch.
*/

"use server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import ContactForm from "./_components/contact-form"

export default async function ContactPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground">
          Have a question or need help? Get in touch with our team.
        </p>
      </div>

      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Send us a message</CardTitle>
          <CardDescription>
            Fill out the form below and we'll get back to you as soon as
            possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  )
}
