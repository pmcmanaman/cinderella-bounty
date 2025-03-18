/**
 * @file cinderella-actions.ts
 * @description
 *   Provides server actions for Cinderella Bounty: picks, auctions, trades, scoring.
 *   NOTE: Because Drizzle interprets numeric columns as strings in your environment,
 *   we must pass string values for columns like "amount".
 */

"use server"

import { db } from "@/db/db"
import {
  teamsTable,
  picksTable,
  auctionsTable,
  bidsTable,
  tradesTable,
  scoresTable,
  InsertPick,
  InsertAuction,
  InsertBid,
  InsertTrade,
  SelectAuction,
  SelectTrade,
  auctionStatusEnum,
  tradeStatusEnum
} from "@/db/schema"
import { eq, inArray, and, sql, desc } from "drizzle-orm"
import { ActionState } from "@/types"
import { drizzle } from "drizzle-orm/postgres-js"

// For cinderellas (9–16) and favorites (1–4).
const CINDERELLA_SEEDS = [9, 10, 11, 12, 13, 14, 15, 16]
const FAVORITE_SEEDS = [1, 2, 3, 4]

// 1) CREATE USER PICKS
export async function createUserPicksAction(
  userId: string,
  teamIds: string[]
): Promise<ActionState<void>> {
  try {
    if (!userId || !teamIds || teamIds.length !== 4) {
      return {
        isSuccess: false,
        message:
          "You must select exactly 4 teams: 3 cinderellas (seeds 9–16) and 1 favorite (seeds 1–4)."
      }
    }

    // Check if user already has picks
    const existingPicks = await db.query.picks.findFirst({
      where: eq(picksTable.userId, userId)
    })
    if (existingPicks) {
      return {
        isSuccess: false,
        message: "You have already made your picks. You cannot pick again."
      }
    }

    // Fetch teams
    const teams = await db.query.teams.findMany({
      where: inArray(teamsTable.id, teamIds)
    })
    if (teams.length !== 4) {
      return {
        isSuccess: false,
        message: "One or more selected teams could not be found."
      }
    }

    let cinderellaCount = 0
    let favoriteCount = 0
    const uniqueCheckSet = new Set<string>()

    for (const team of teams) {
      if (uniqueCheckSet.has(team.id)) {
        return {
          isSuccess: false,
          message: `Duplicate team selection: ${team.name}`
        }
      }
      uniqueCheckSet.add(team.id)

      if (CINDERELLA_SEEDS.includes(team.seed)) cinderellaCount++
      else if (FAVORITE_SEEDS.includes(team.seed)) favoriteCount++
      else {
        return {
          isSuccess: false,
          message: `Team ${team.name} (seed ${team.seed}) is neither cinderella nor favorite.`
        }
      }
    }

    if (cinderellaCount !== 3 || favoriteCount !== 1) {
      return {
        isSuccess: false,
        message:
          "Invalid distribution: exactly 3 cinderellas + 1 favorite required."
      }
    }

    // Insert picks
    const picksToInsert: InsertPick[] = teams.map(team => ({
      userId,
      teamId: team.id,
      type: CINDERELLA_SEEDS.includes(team.seed) ? "cinderella" : "favorite"
    }))

    await db.transaction(async tx => {
      await tx.insert(picksTable).values(picksToInsert)
    })

    // Check for contested teams => create auction if needed
    for (const team of teams) {
      const pickCountResult = await db
        .select({
          pickCount: sql<number>`COUNT(*)::int`
        })
        .from(picksTable)
        .where(eq(picksTable.teamId, team.id))
        .execute()

      const pickCount = pickCountResult[0]?.pickCount || 0
      if (pickCount > 1) {
        const existingAuction = await db.query.auctions.findFirst({
          where: eq(auctionsTable.teamId, team.id)
        })
        if (!existingAuction) {
          await createAuctionAction(team.id)
        }
      }
    }

    return {
      isSuccess: true,
      message: "Picks created successfully",
      data: undefined
    }
  } catch (error) {
    console.error("[createUserPicksAction] Error:", error)
    return { isSuccess: false, message: "Failed to create user picks." }
  }
}

// 2) AUCTIONS & BIDS
export async function createAuctionAction(
  teamId: string
): Promise<ActionState<SelectAuction>> {
  try {
    const [auction] = await db
      .insert(auctionsTable)
      .values({
        teamId,
        status: "scheduled"
      } as InsertAuction)
      .returning()

    return {
      isSuccess: true,
      message: "Auction created",
      data: auction
    }
  } catch (error) {
    console.error("[createAuctionAction] Error:", error)
    return { isSuccess: false, message: "Failed to create auction" }
  }
}

/**
 * @function placeBidAction
 * @description
 *   Drizzle interprets bidsTable.amount as a string. So we must pass "amount.toString()".
 */
export async function placeBidAction(
  auctionId: string,
  userId: string,
  amount: number // We'll convert to string below
): Promise<ActionState<void>> {
  try {
    await db.transaction(async tx => {
      // Check auction
      const auction = await tx.query.auctions.findFirst({
        where: eq(auctionsTable.id, auctionId)
      })
      if (!auction) throw new Error("Auction not found.")
      if (auction.status !== "open" && auction.status !== "scheduled") {
        throw new Error(
          `Cannot place bid on auction with status: ${auction.status}.`
        )
      }
      if (auction.endTime && new Date() > auction.endTime) {
        throw new Error("Auction has already ended.")
      }

      // Highest bid
      const [highestBid] = await tx
        .select({
          maxAmount: sql<string>`MAX(${bidsTable.amount})` // Drizzle sees as string
        })
        .from(bidsTable)
        .where(eq(bidsTable.auctionId, auctionId))

      const currentHighest = highestBid?.maxAmount
        ? parseFloat(highestBid.maxAmount)
        : 0
      if (amount <= currentHighest) {
        throw new Error(
          `Your bid must exceed the current highest bid of ${currentHighest}.`
        )
      }

      // Insert with string "amount"
      await tx.insert(bidsTable).values({
        auctionId,
        userId,
        amount: amount.toString() // IMPORTANT fix
      } as InsertBid)
    })

    return { isSuccess: true, message: "Bid placed", data: undefined }
  } catch (error: any) {
    console.error("[placeBidAction] Error:", error)
    return {
      isSuccess: false,
      message: error.message || "Failed to place bid"
    }
  }
}

export async function closeAuctionAction(
  auctionId: string
): Promise<ActionState<void>> {
  try {
    const [topBid] = await db
      .select({
        userId: bidsTable.userId,
        maxAmount: sql<string>`MAX(${bidsTable.amount})`
      })
      .from(bidsTable)
      .where(eq(bidsTable.auctionId, auctionId))
      .groupBy(bidsTable.userId)
      .orderBy(desc(sql`MAX(${bidsTable.amount})`))
      .limit(1)

    if (!topBid) {
      await db
        .update(auctionsTable)
        .set({ status: "closed" })
        .where(eq(auctionsTable.id, auctionId))
      return {
        isSuccess: true,
        message: "Auction closed with no bids",
        data: undefined
      }
    }

    // Convert final bid string -> number -> string again if needed
    const finalBid = parseFloat(topBid.maxAmount).toFixed(2)

    await db
      .update(auctionsTable)
      .set({
        status: "closed",
        finalBidAmount: finalBid, // Must be a string
        winnerUserId: topBid.userId
      })
      .where(eq(auctionsTable.id, auctionId))

    return { isSuccess: true, message: "Auction closed", data: undefined }
  } catch (error) {
    console.error("[closeAuctionAction] Error:", error)
    return { isSuccess: false, message: "Failed to close auction" }
  }
}

// 3) TRADES
export async function createTradeOfferAction(
  initiatorId: string,
  recipientId: string,
  initiatorTeamId: string,
  recipientTeamId: string,
  cashAmount = 0
): Promise<ActionState<SelectTrade>> {
  try {
    const [initiatorPick] = await db
      .select()
      .from(picksTable)
      .where(and(eq(picksTable.userId, initiatorId), eq(picksTable.teamId, initiatorTeamId)))
      .limit(1)
    if (!initiatorPick) {
      return {
        isSuccess: false,
        message: "Initiator does not own specified team."
      }
    }

    const [recipientPick] = await db
      .select()
      .from(picksTable)
      .where(and(eq(picksTable.userId, recipientId), eq(picksTable.teamId, recipientTeamId)))
      .limit(1)
    if (!recipientPick) {
      return {
        isSuccess: false,
        message: "Recipient does not own specified team."
      }
    }

    // Drizzle sees tradesTable.cashAmount as string
    const cashString = cashAmount.toString()

    const [newTrade] = await db
      .insert(tradesTable)
      .values({
        initiatorId,
        recipientId,
        initiatorTeamId,
        recipientTeamId,
        cashAmount: cashString,
        status: "pending"
      } as InsertTrade)
      .returning()

    return { isSuccess: true, message: "Trade offer created", data: newTrade }
  } catch (error) {
    console.error("[createTradeOfferAction] Error:", error)
    return { isSuccess: false, message: "Failed to create trade offer" }
  }
}

export async function respondToTradeOfferAction(
  tradeId: string,
  accept: boolean
): Promise<ActionState<void>> {
  try {
    const trade = await db.query.trades.findFirst({
      where: eq(tradesTable.id, tradeId)
    })
    if (!trade) {
      return { isSuccess: false, message: "Trade not found" }
    }
    if (trade.status !== "pending") {
      return {
        isSuccess: false,
        message: `Cannot respond to trade with status ${trade.status}.`
      }
    }

    if (!accept) {
      await db
        .update(tradesTable)
        .set({ status: "rejected" })
        .where(eq(tradesTable.id, tradeId))
      return { isSuccess: true, message: "Trade rejected", data: undefined }
    }

    // ACCEPT
    await db.transaction(async tx => {
      // picks swap
      await tx
        .update(picksTable)
        .set({ userId: trade.recipientId })
        .where(and(eq(picksTable.userId, trade.initiatorId), eq(picksTable.teamId, trade.initiatorTeamId)))

      await tx
        .update(picksTable)
        .set({ userId: trade.initiatorId })
        .where(and(eq(picksTable.userId, trade.recipientId), eq(picksTable.teamId, trade.recipientTeamId)))

      await tx
        .update(tradesTable)
        .set({ status: "accepted" })
        .where(eq(tradesTable.id, tradeId))
    })

    return { isSuccess: true, message: "Trade accepted", data: undefined }
  } catch (error) {
    console.error("[respondToTradeOfferAction] Error:", error)
    return { isSuccess: false, message: "Failed to respond to trade" }
  }
}

// 4) SCORING
export async function updateScoresAction(
  winningTeamId: string,
  round: string
): Promise<ActionState<void>> {
  try {
    const team = await db.query.teams.findFirst({
      where: eq(teamsTable.id, winningTeamId)
    })
    if (!team) {
      return { isSuccess: false, message: "Winning team not found" }
    }

    const basePoints = FAVORITE_SEEDS.includes(team.seed) ? 5 : team.seed

    let multiplier = 1
    switch (round.toLowerCase()) {
      case "sweet 16":
        multiplier = 2
        break
      case "elite 8":
        multiplier = 3
        break
      case "final 4":
        multiplier = 4
        break
      case "championship":
        multiplier = 5
        break
      default:
        multiplier = 1
    }

    const pointsAwarded = basePoints * multiplier

    const relevantPicks = await db.query.picks.findMany({
      where: eq(picksTable.teamId, winningTeamId)
    })

    for (const pick of relevantPicks) {
      await db
        .insert(scoresTable)
        .values({ userId: pick.userId })
        .onConflictDoNothing({ target: scoresTable.userId })

      await db
        .update(scoresTable)
        .set({
          currentScore: sql`${scoresTable.currentScore} + ${pointsAwarded}`
        })
        .where(eq(scoresTable.userId, pick.userId))
    }

    return {
      isSuccess: true,
      message: `Scores updated (+${pointsAwarded}) for round=${round}`,
      data: undefined
    }
  } catch (error) {
    console.error("[updateScoresAction] Error:", error)
    return { isSuccess: false, message: "Failed to update scores" }
  }
}
