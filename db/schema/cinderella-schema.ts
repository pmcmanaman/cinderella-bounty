/**
 * @file cinderella-schema.ts
 * @description
 *   Defines database tables for Cinderella Bounty:
 *   - teamsTable
 *   - picksTable
 *   - auctionsTable
 *   - bidsTable
 *   - tradesTable
 *   - scoresTable (Step 5)
 *
 * @purpose
 *   - Provide schema definitions for all core gameplay mechanics in Cinderella Bounty.
 *   - The new scoresTable tracks each user's current score in a separate table.
 *
 * @notes
 *   - This approach avoids cluttering the profilesTable with game-specific data.
 *   - If a user doesn't play Cinderella Bounty, they might not have a row here (or we can create it on sign-up).
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  pgEnum
} from "drizzle-orm/pg-core"
import { profilesTable } from "@/db/schema/profiles-schema"

// ======================================================================
//  1. TEAMS & PICKS
// ======================================================================
export const pickTypeEnum = pgEnum("pick_type", ["cinderella", "favorite"])

export const teamsTable = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  seed: integer("seed").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertTeam = typeof teamsTable.$inferInsert
export type SelectTeam = typeof teamsTable.$inferSelect

export const picksTable = pgTable("picks", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),

  teamId: uuid("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),

  type: pickTypeEnum("type").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPick = typeof picksTable.$inferInsert
export type SelectPick = typeof picksTable.$inferSelect

// ======================================================================
//  2. AUCTIONS, BIDS, TRADES
// ======================================================================
export const auctionStatusEnum = pgEnum("auction_status", [
  "scheduled",
  "open",
  "closed"
])

export const auctionsTable = pgTable("auctions", {
  id: uuid("id").defaultRandom().primaryKey(),

  teamId: uuid("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),

  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),

  status: auctionStatusEnum("status").notNull().default("scheduled"),

  finalBidAmount: numeric("final_bid_amount", { precision: 10, scale: 2 }),
  winnerUserId: text("winner_user_id").references(() => profilesTable.userId),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertAuction = typeof auctionsTable.$inferInsert
export type SelectAuction = typeof auctionsTable.$inferSelect

export const bidsTable = pgTable("bids", {
  id: uuid("id").defaultRandom().primaryKey(),

  auctionId: uuid("auction_id")
    .notNull()
    .references(() => auctionsTable.id, { onDelete: "cascade" }),

  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),

  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertBid = typeof bidsTable.$inferInsert
export type SelectBid = typeof bidsTable.$inferSelect

export const tradeStatusEnum = pgEnum("trade_status", [
  "pending",
  "accepted",
  "rejected",
  "canceled"
])

export const tradesTable = pgTable("trades", {
  id: uuid("id").defaultRandom().primaryKey(),

  initiatorId: text("initiator_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),

  recipientId: text("recipient_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),

  initiatorTeamId: uuid("initiator_team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),

  recipientTeamId: uuid("recipient_team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),

  cashAmount: numeric("cash_amount", { precision: 10, scale: 2 }).default("0"),

  status: tradeStatusEnum("status").notNull().default("pending"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertTrade = typeof tradesTable.$inferInsert
export type SelectTrade = typeof tradesTable.$inferSelect

// ======================================================================
//  3. SCORES (Step 5)
// ======================================================================
/**
 * @table scoresTable
 * @description
 *   Stores each user's current score for the Cinderella Bounty tournament.
 *   This allows us to keep the game logic separate from the base profiles table.
 *
 * @fields
 *   - userId: references profilesTable.userId (unique primary key if we want 1:1 with user)
 *   - currentScore: integer representing the user's current accumulated points
 *   - createdAt, updatedAt: timestamps for tracking creation and updates
 *
 * @usage
 *   - Insert a row when a user first participates.
 *   - Update currentScore after each game result or trade logic.
 */
export const scoresTable = pgTable("scores", {
  userId: text("user_id")
    .primaryKey()
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),

  currentScore: integer("current_score").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

/**
 * @type InsertScore
 *   - For inserting a new score record when user first participates
 */
export type InsertScore = typeof scoresTable.$inferInsert

/**
 * @type SelectScore
 *   - For reading an existing score record from the database
 */
export type SelectScore = typeof scoresTable.$inferSelect
