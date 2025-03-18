/**
 * @file cinderella-schema.ts
 * @description
 *   Defines database tables for Cinderella Bounty:
 *   - teamsTable
 *   - picksTable
 *   - auctionsTable
 *   - bidsTable
 *   - tradesTable
 *   - scoresTable
 *
 * @purpose
 *   - Provide schema definitions for all core gameplay mechanics in Cinderella Bounty.
 *   - We keep numeric(...) columns as strings in Drizzle to avoid "transform is not a function."
 *   - After editing, re-run `npm run db:generate && npm run db:migrate` to update definitions.
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

// ---------------------------------------------------------------------
// 1. TEAMS & PICKS
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// 2. AUCTIONS, BIDS, TRADES
// ---------------------------------------------------------------------
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

  // Drizzle sees this as string (because no transform/parse).
  // The DB column is numeric(10,2).
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

  // Also a string in Drizzle, numeric(10,2) in DB
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

  // Also a string, numeric(10,2) in DB
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

// ---------------------------------------------------------------------
// 3. SCORES
// ---------------------------------------------------------------------
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

export type InsertScore = typeof scoresTable.$inferInsert
export type SelectScore = typeof scoresTable.$inferSelect
