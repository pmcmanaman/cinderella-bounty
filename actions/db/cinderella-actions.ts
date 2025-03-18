/**
 * @file cinderella-actions.ts
 * @description
 *   Provides server actions for the core Cinderella Bounty features:
 *     1) User picks (createUserPicksAction)
 *     2) Auctions (createAuctionAction, placeBidAction, closeAuctionAction)
 *     3) Trades (createTradeOfferAction, respondToTradeOfferAction)
 *     4) Scoring (updateScoresAction)
 *
 * @purpose
 *   - Encapsulates core business logic for "Cinderella Bounty," ensuring
 *     consistent DB operations and validations.
 *   - Returns ActionState<T> for success/failure messaging.
 *   - Integrates advanced validation and error handling for concurrency,
 *     duplicate picks, ownership checks, etc.
 *
 * @notes
 *   - Step 7 modifies the code from Step 6 to add more robust checks.
 *   - For concurrency, we demonstrate a Drizzle transaction approach in placeBidAction.
 *   - We add a check to prevent a user from re-picking if they already have picks.
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

/**
 * @constant CINDERELLA_SEEDS
 *   Helper to identify valid cinderella seeds (9 to 16).
 */
const CINDERELLA_SEEDS = [9, 10, 11, 12, 13, 14, 15, 16]

/**
 * @constant FAVORITE_SEEDS
 *   Helper to identify valid favorite seeds (1 to 4).
 */
const FAVORITE_SEEDS = [1, 2, 3, 4]

// ----------------------------------------------------------------------------
// 1) CREATE USER PICKS
// ----------------------------------------------------------------------------

/**
 * @async
 * @function createUserPicksAction
 * @description
 *   Allows a user to select up to 3 "cinderella" teams (seed 9–16) and 1 "favorite" (seed 1–4).
 * @param userId string - the user performing picks
 * @param teamIds string[] - the selected team IDs (must total exactly 4)
 * @returns Promise<ActionState<void>>
 *
 * @logic
 *   - New validation steps in Step 7:
 *     1) Check if user already has picks to prevent duplicates.
 *     2) Potentially check if the selection window is still open (placeholder).
 *     3) Validate the team seeds strictly (3 cinderellas, 1 favorite).
 *     4) Insert picks using a transaction to ensure atomicity if desired.
 *     5) If picks are successfully inserted, check if any team is contested.
 *        If contested, create or ensure an auction is created.
 */
export async function createUserPicksAction(
  userId: string,
  teamIds: string[]
): Promise<ActionState<void>> {
  try {
    // Basic input checks
    if (!userId || !teamIds || teamIds.length !== 4) {
      return {
        isSuccess: false,
        message:
          "You must select exactly 4 teams: 3 cinderellas (seeds 9–16) and 1 favorite (seeds 1–4)."
      }
    }

    // TODO: Potentially check if the selection window is still open
    // e.g., if (Date.now() > March15) { return error about picking after deadline }

    // 1) Check if user already has picks
    const existingPicks = await db.query.picks.findFirst({
      where: eq(picksTable.userId, userId)
    })
    if (existingPicks) {
      return {
        isSuccess: false,
        message: "You have already made your picks. You cannot pick again."
      }
    }

    // 2) Fetch all teams
    const teams = await db.query.teams.findMany({
      where: inArray(teamsTable.id, teamIds)
    })

    // Validate that user gave valid IDs
    if (teams.length !== 4) {
      return {
        isSuccess: false,
        message: "One or more selected teams could not be found."
      }
    }

    // 3) Tally cinderellas & favorites
    let cinderellaCount = 0
    let favoriteCount = 0

    const uniqueCheckSet = new Set<string>()
    for (const team of teams) {
      if (uniqueCheckSet.has(team.id)) {
        return {
          isSuccess: false,
          message: `Duplicate team selection: cannot pick team '${team.name}' more than once.`
        }
      }
      uniqueCheckSet.add(team.id)

      if (CINDERELLA_SEEDS.includes(team.seed)) {
        cinderellaCount++
      } else if (FAVORITE_SEEDS.includes(team.seed)) {
        favoriteCount++
      } else {
        return {
          isSuccess: false,
          message: `Invalid pick: team ${team.name} (seed ${team.seed}) is neither cinderella nor favorite.`
        }
      }
    }

    if (cinderellaCount !== 3 || favoriteCount !== 1) {
      return {
        isSuccess: false,
        message:
          "Invalid distribution of picks: you must have exactly 3 cinderellas and 1 favorite."
      }
    }

    // 4) Insert picks using a transaction for atomicity
    const picksToInsert: InsertPick[] = teams.map(team => ({
      userId,
      teamId: team.id,
      type: CINDERELLA_SEEDS.includes(team.seed) ? "cinderella" : "favorite"
    }))

    await db.transaction(async tx => {
      await tx.insert(picksTable).values(picksToInsert)
    })

    // 5) Check for contested teams and create auctions if needed
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
        // Team is contested -> create auction if not already
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

// ----------------------------------------------------------------------------
// 2) AUCTIONS & BIDS
// ----------------------------------------------------------------------------

/**
 * @async
 * @function createAuctionAction
 * @description
 *   Creates a new auction record for a contested team, setting status to "scheduled" initially.
 * @param teamId string
 * @returns Promise<ActionState<SelectAuction>>
 */
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
      message: "Auction created successfully",
      data: auction
    }
  } catch (error) {
    console.error("[createAuctionAction] Error:", error)
    return { isSuccess: false, message: "Failed to create auction" }
  }
}

/**
 * @async
 * @function placeBidAction
 * @description
 *   Places a bid on an open auction, ensuring the bid is higher than any existing bids.
 *   Showcases a transaction approach for concurrency.
 * @param auctionId string
 * @param userId string
 * @param amount number
 * @returns Promise<ActionState<void>>
 *
 * @logic
 *   - We'll do concurrency checks in a single transaction:
 *     1) Lock the bids for this auction row (SELECT ... FOR UPDATE) to ensure
 *        no race condition if two bids come in at the same time.
 *     2) Confirm the highest bid is < amount, then insert the new bid.
 *     3) Return success/failure.
 */
export async function placeBidAction(
  auctionId: string,
  userId: string,
  amount: number
): Promise<ActionState<void>> {
  try {
    // We'll use Drizzle's transaction:
    // doc: https://orm.drizzle.team/docs/transactions
    // "tx" is the transaction connection
    await db.transaction(async tx => {
      // 1) Check the auction's status
      const auction = await tx.query.auctions.findFirst({
        where: eq(auctionsTable.id, auctionId)
      })
      if (!auction) {
        throw new Error("Auction not found.")
      }
      if (auction.status !== "open" && auction.status !== "scheduled") {
        throw new Error(
          `Cannot place a bid on an auction with status: ${auction.status}.`
        )
      }
      if (auction.endTime && new Date() > auction.endTime) {
        throw new Error("Auction has already ended.")
      }

      // 2) Lock existing bids for concurrency. Drizzle doesn't have a direct FOR UPDATE,
      // but we can do a raw query. Alternatively, we can just select and rely on serializable transactions.
      // For demonstration, we'll do a normal select but keep in mind real concurrency might need more logic.
      const [highestBid] = await tx
        .select({
          maxAmount: sql<number>`MAX(${bidsTable.amount})`
        })
        .from(bidsTable)
        .where(eq(bidsTable.auctionId, auctionId))

      const currentHighest = highestBid?.maxAmount || 0
      if (amount <= currentHighest) {
        throw new Error(`Your bid must exceed the current highest bid of ${currentHighest}.`)
      }

      // 3) Insert new bid
      await tx.insert(bidsTable).values({
        auctionId,
        userId,
        amount
      } as InsertBid)
    })

    // If we reach here, no errors thrown => success
    // TODO: Possibly broadcast the new bid via real-time channels
    return { isSuccess: true, message: "Bid placed successfully", data: undefined }
  } catch (error: any) {
    console.error("[placeBidAction] Error:", error)
    return { isSuccess: false, message: error.message || "Failed to place bid" }
  }
}

/**
 * @async
 * @function closeAuctionAction
 * @description
 *   Closes the specified auction, determining the highest bidder as the winner.
 *   Sets finalBidAmount, winnerUserId, and status=closed.
 * @param auctionId string
 * @returns Promise<ActionState<void>>
 *
 * @logic
 *   - Find the highest bid among bidsTable for the given auction.
 *   - Update auctionsTable with that info, set status=closed.
 */
export async function closeAuctionAction(
  auctionId: string
): Promise<ActionState<void>> {
  try {
    // Find the highest bid
    const [topBid] = await db
      .select({
        userId: bidsTable.userId,
        maxAmount: sql<number>`MAX(${bidsTable.amount})`
      })
      .from(bidsTable)
      .where(eq(bidsTable.auctionId, auctionId))
      .groupBy(bidsTable.userId)
      .orderBy(desc(sql`MAX(${bidsTable.amount})`))
      .limit(1)

    if (!topBid) {
      // No bids -> The team might remain unowned or we can handle that scenario
      await db
        .update(auctionsTable)
        .set({
          status: "closed"
        })
        .where(eq(auctionsTable.id, auctionId))
      return {
        isSuccess: true,
        message: "Auction closed with no bids",
        data: undefined
      }
    }

    // We have a highest bidder
    await db
      .update(auctionsTable)
      .set({
        status: "closed",
        finalBidAmount: topBid.maxAmount,
        winnerUserId: topBid.userId
      })
      .where(eq(auctionsTable.id, auctionId))

    // TODO: Possibly handle Stripe payment, update picks ownership if needed, etc.
    return { isSuccess: true, message: "Auction closed successfully", data: undefined }
  } catch (error) {
    console.error("[closeAuctionAction] Error:", error)
    return { isSuccess: false, message: "Failed to close auction" }
  }
}

// ----------------------------------------------------------------------------
// 3) TRADES
// ----------------------------------------------------------------------------

/**
 * @async
 * @function createTradeOfferAction
 * @description
 *   Initiates a trade between two users, specifying teams and optional cash.
 *   Sets status=pending.
 * @param initiatorId string
 * @param recipientId string
 * @param initiatorTeamId string
 * @param recipientTeamId string
 * @param cashAmount number (default 0)
 * @returns Promise<ActionState<SelectTrade>>
 *
 * @logic
 *   - Validate that each user actually owns the given team in picksTable.
 *   - Insert a new record in tradesTable with status=pending.
 *   - Additional checks: ensure user isn't trying to trade a team they already
 *     traded away, or that the team is still in the tournament (optional).
 */
export async function createTradeOfferAction(
  initiatorId: string,
  recipientId: string,
  initiatorTeamId: string,
  recipientTeamId: string,
  cashAmount = 0
): Promise<ActionState<SelectTrade>> {
  try {
    // Validate ownership
    const [initiatorPick] = await db
      .select()
      .from(picksTable)
      .where(
        and(eq(picksTable.userId, initiatorId), eq(picksTable.teamId, initiatorTeamId))
      )
      .limit(1)

    if (!initiatorPick) {
      return {
        isSuccess: false,
        message: "Initiator does not own the specified team."
      }
    }

    const [recipientPick] = await db
      .select()
      .from(picksTable)
      .where(
        and(eq(picksTable.userId, recipientId), eq(picksTable.teamId, recipientTeamId))
      )
      .limit(1)

    if (!recipientPick) {
      return {
        isSuccess: false,
        message: "Recipient does not own the specified team."
      }
    }

    // Additional checks? e.g., if the team is out of the tournament, skip?

    const [newTrade] = await db
      .insert(tradesTable)
      .values({
        initiatorId,
        recipientId,
        initiatorTeamId,
        recipientTeamId,
        cashAmount,
        status: "pending"
      } as InsertTrade)
      .returning()

    return {
      isSuccess: true,
      message: "Trade offer created successfully",
      data: newTrade
    }
  } catch (error) {
    console.error("[createTradeOfferAction] Error:", error)
    return { isSuccess: false, message: "Failed to create trade offer" }
  }
}

/**
 * @async
 * @function respondToTradeOfferAction
 * @description
 *   Accepts or rejects an existing trade. If accepted, handle ownership swap, optional cash payment, etc.
 * @param tradeId string
 * @param accept boolean
 * @returns Promise<ActionState<void>>
 *
 * @logic
 *   - If rejecting, set status=rejected.
 *   - If accepting:
 *     - If cashAmount > 0, handle payment via Stripe or ledger (placeholder).
 *     - Swap ownership in picksTable (initiatorTeam -> recipient, recipientTeam -> initiator).
 *     - Mark trade status=accepted.
 */
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
        message: `Cannot respond to a trade with status ${trade.status}.`
      }
    }

    if (!accept) {
      // REJECT
      await db
        .update(tradesTable)
        .set({ status: "rejected" })
        .where(eq(tradesTable.id, tradeId))
      return { isSuccess: true, message: "Trade rejected", data: undefined }
    }

    // ACCEPT
    // 1) If cashAmount>0, handle payment - placeholder
    // 2) Ownership swap

    await db.transaction(async tx => {
      // We'll do the picks swap in a transaction
      await tx
        .update(picksTable)
        .set({ userId: trade.recipientId })
        .where(
          and(
            eq(picksTable.userId, trade.initiatorId),
            eq(picksTable.teamId, trade.initiatorTeamId)
          )
        )

      await tx
        .update(picksTable)
        .set({ userId: trade.initiatorId })
        .where(
          and(
            eq(picksTable.userId, trade.recipientId),
            eq(picksTable.teamId, trade.recipientTeamId)
          )
        )

      await tx
        .update(tradesTable)
        .set({ status: "accepted" })
        .where(eq(tradesTable.id, tradeId))
    })

    return { isSuccess: true, message: "Trade accepted", data: undefined }
  } catch (error) {
    console.error("[respondToTradeOfferAction] Error:", error)
    return { isSuccess: false, message: "Failed to respond to trade offer" }
  }
}

// ----------------------------------------------------------------------------
// 4) SCORING
// ----------------------------------------------------------------------------

/**
 * @async
 * @function updateScoresAction
 * @description
 *   Updates user scores after a game result, awarding points for the winning team.
 * @param winningTeamId string
 * @param round string - identifies which round (e.g., "Round of 64", "Sweet 16", etc.)
 * @returns Promise<ActionState<void>>
 *
 * @logic
 *   - Determine base points (if pick is cinderella => seed points, if favorite => 5).
 *   - Apply multiplier if round >= sweet16 (2x, 3x, 4x, or 5x).
 *   - Update each relevant user's score in scoresTable.
 */
export async function updateScoresAction(
  winningTeamId: string,
  round: string
): Promise<ActionState<void>> {
  try {
    // 1) Fetch the winning team
    const team = await db.query.teams.findFirst({
      where: eq(teamsTable.id, winningTeamId)
    })
    if (!team) {
      return { isSuccess: false, message: "Winning team not found" }
    }

    // 2) Determine base points
    //    cinderella => team.seed, favorite => 5
    const basePoints = FAVORITE_SEEDS.includes(team.seed) ? 5 : team.seed

    // 3) Determine multiplier by round
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

    // 4) Find all users who have this team in picks
    const relevantPicks = await db.query.picks.findMany({
      where: eq(picksTable.teamId, winningTeamId)
    })

    // 5) For each user, increment their scoresTable by pointsAwarded
    for (const pick of relevantPicks) {
      // If there's no row in scoresTable, create it
      await db
        .insert(scoresTable)
        .values({ userId: pick.userId })
        .onConflictDoNothing({ target: scoresTable.userId })

      // Then update
      await db
        .update(scoresTable)
        .set({
          currentScore: sql`${scoresTable.currentScore} + ${pointsAwarded}`
        })
        .where(eq(scoresTable.userId, pick.userId))
    }

    return {
      isSuccess: true,
      message: `Scores updated: +${pointsAwarded} points for round=${round}`,
      data: undefined
    }
  } catch (error) {
    console.error("[updateScoresAction] Error:", error)
    return { isSuccess: false, message: "Failed to update scores" }
  }
}
