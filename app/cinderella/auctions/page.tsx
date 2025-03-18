/**
 * @file page.tsx (Server Component)
 * @description
 *   Displays the Auctions page under "/cinderella/auctions". Fetches all active,
 *   scheduled, or recently closed auctions, and provides a local server action
 *   to handle placing bids through "auction-view.tsx".
 *
 * @notes
 *   - We demonstrate a simple approach: load auctions from the DB, pass them to
 *     the AuctionView client component. AuctionView can poll or wait for user
 *     action to place new bids.
 *   - Because we do not call server actions in a client component, we define
 *     a local server action in this file: "handlePlaceBid".
 *   - Step 10 from the plan: "Auctions Page"
 */

"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { placeBidAction } from "@/actions/db/cinderella-actions"
import { db } from "@/db/db"
import { auctionsTable, bidsTable, teamsTable } from "@/db/schema"
import { auctionStatusEnum } from "@/db/schema/cinderella-schema"
import { and, eq, inArray, sql, desc } from "drizzle-orm"

import AuctionView from "../_components/auction-view"

/**
 * @async
 * @function handlePlaceBid
 * @description
 *   A local server action that calls "placeBidAction". Receives the auctionId,
 *   bid amount, etc., along with the current user ID via Clerk. Returns success
 *   or error message to the client.
 */
async function handlePlaceBid(auctionId: string, amount: number) {
  const { userId } = await auth()
  if (!userId) {
    return {
      isSuccess: false,
      message: "You must be signed in to place bids."
    }
  }

  // Validate input
  if (!auctionId || !amount || amount <= 0) {
    return {
      isSuccess: false,
      message: "Invalid bid data."
    }
  }

  // Call the DB action
  const result = await placeBidAction(auctionId, userId, amount)
  return result
}

/**
 * @async
 * @default function AuctionsPage
 * @description
 *   Server component to fetch a list of auctions from the DB and render them
 *   via AuctionView. Also defines a local server action for placing bids.
 */
export default async function AuctionsPage() {
  // 1) We can define what auctions to show. Let's get all "scheduled" or "open"
  //    auctions, plus optionally recent "closed" ones in the last day, for example.
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Query the auctions table for auctions with status in ["scheduled","open"],
  // or "closed" but updatedAt within last day, just as an example.
  const relevantAuctions = await db.query.auctions.findMany({
    where: or(
      inArray(auctionsTable.status, ["scheduled", "open"]),
      and(
        eq(auctionsTable.status, "closed"),
        sql`${auctionsTable.updatedAt} > ${oneDayAgo.toISOString()}`
      )
    ),
    orderBy: desc(auctionsTable.updatedAt),
    with: {
      // Use "with" to do a join or to embed sub-queries if supported.
      // We can do a join with "teamsTable" to get the team name/seed, but drizzle-orm
      // doesn't do eager loading automatically, so let's do a separate step below or raw join.
    }
  })

  // 2) We want the associated team data, so let's do a separate fetch or a raw join.
  //    We'll map each auction to its team data so the client can show it easily.
  //    For a small dataset, this is fine; for large data, you'd do a single query with a join.
  const teamIds = relevantAuctions.map(a => a.teamId)
  const teamsMap = new Map<string, { id: string; name: string; seed: number }>()
  if (teamIds.length > 0) {
    const teams = await db.query.teams.findMany({
      where: inArray(teamsTable.id, teamIds)
    })
    teams.forEach(t => {
      teamsMap.set(t.id, { id: t.id, name: t.name, seed: t.seed })
    })
  }

  // 3) Combine the auctions with their team info
  const auctionsWithTeams = relevantAuctions.map(auction => {
    const t = teamsMap.get(auction.teamId)
    return {
      ...auction,
      team: t ? { ...t } : null
    }
  })

  return (
    <Suspense fallback={<div className="p-4">Loading auctions...</div>}>
      <div className="container mx-auto py-8">
        <h1 className="mb-4 text-center text-2xl font-bold">
          Ongoing Auctions
        </h1>

        <AuctionView
          auctions={auctionsWithTeams}
          placeBidServerAction={handlePlaceBid}
        />
      </div>
    </Suspense>
  )
}
