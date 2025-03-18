/**
 * @file db.ts
 * @description
 *   Initializes Postgres client and Drizzle ORM schema.
 *   Now includes 'scoresTable' from Step 5 in the schema object.
 */

import {
  profilesTable,
  teamsTable,
  picksTable,
  auctionsTable,
  bidsTable,
  tradesTable,
  scoresTable
} from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

// Load environment variables
config({ path: ".env.local" })

const schema = {
  profiles: profilesTable,
  teams: teamsTable,
  picks: picksTable,
  auctions: auctionsTable,
  bids: bidsTable,
  trades: tradesTable,
  scores: scoresTable
}

const client = postgres(process.env.DATABASE_URL!)

export const db = drizzle(client, { schema })
