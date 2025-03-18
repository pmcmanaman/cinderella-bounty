/**
 * @file page.tsx (Server Component)
 * @description
 *   This file provides the main "Pick Teams" page for Cinderella Bounty. It:
 *     1) Fetches available teams from the database (seeds 1–4, 9–16).
 *     2) Renders a client component <PickTeamsForm> with those teams.
 *     3) Defines a local server action handlePickSubmission that calls
 *        createUserPicksAction to store the user's picks.
 *
 * @notes
 *   - We fetch both cinderella (9–16) and favorite (1–4) seeds in a single query,
 *     then pass them to the form as separate arrays.
 *   - The user’s ID is retrieved via Clerk's `auth()`.
 *   - The client form calls handlePickSubmission with the selected team IDs.
 *   - This approach adheres to the project rule about not calling server actions
 *     directly in client components (we define a local server action here).
 */

"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { createUserPicksAction } from "@/actions/db/cinderella-actions"
import { db } from "@/db/db"
import { teamsTable } from "@/db/schema"
import { eq, or, gte, lte } from "drizzle-orm"

import PickTeamsForm from "./_components/pick-teams-form"

/**
 * @async
 * @function handlePickSubmission
 * @description
 *   A local server action that receives an array of team IDs from the client,
 *   retrieves the current user ID via Clerk, and calls createUserPicksAction
 *   to save their picks.
 * @param teamIds string[] - The array of selected team IDs.
 * @returns A simple object with success/error message to be displayed by the client form.
 */
async function handlePickSubmission(teamIds: string[]) {
  const { userId } = await auth()

  if (!userId) {
    return {
      isSuccess: false,
      message: "You must be signed in to pick teams."
    }
  }

  // Call the DB action
  const res = await createUserPicksAction(userId, teamIds)
  return res
}

/**
 * @async
 * @default function PickTeamsPage
 * @description
 *   Main server page that queries the DB for cinderella/favorite seeds, then
 *   renders <PickTeamsForm> in a Suspense boundary.
 */
export default async function PickTeamsPage() {
  // 1) Fetch all cinderella (9–16) and favorite (1–4) seeds from the DB.
  //    We'll do two separate queries, or a single query with conditions.
  const cinderellaTeamsPromise = db.query.teams.findMany({
    where: and(gte(teamsTable.seed, 9), lte(teamsTable.seed, 16))
  })

  const favoriteTeamsPromise = db.query.teams.findMany({
    where: and(gte(teamsTable.seed, 1), lte(teamsTable.seed, 4))
  })

  const [cinderellaTeams, favoriteTeams] = await Promise.all([
    cinderellaTeamsPromise,
    favoriteTeamsPromise
  ])

  // 2) Render the form in Suspense (though we already resolved the data).
  //    Could be directly rendered, but let's keep the pattern consistent.
  return (
    <Suspense fallback={<div className="p-4">Loading teams...</div>}>
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Pick Your Cinderella & Favorite Teams
        </h1>

        <div className="mx-auto max-w-3xl border p-6 shadow-sm">
          <PickTeamsForm
            cinderellaTeams={cinderellaTeams}
            favoriteTeams={favoriteTeams}
            onSubmitPickTeams={handlePickSubmission}
          />
        </div>
      </div>
    </Suspense>
  )
}
