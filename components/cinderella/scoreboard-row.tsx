/**
 * @file scoreboard-row.tsx
 * @description
 *   Renders a single row in the Cinderella Bounty scoreboard, showing
 *   a user's rank, display name, and current score. Optionally can show
 *   brief pick info or other relevant details.
 *
 * @purpose
 *   - Provide a minimal, reusable scoreboard row for the Cinderella Bounty UI.
 *   - Allows quickly mapping over an array of user data to produce a scoreboard.
 *
 * @notes
 *   - This is a "client component" because it handles purely presentational
 *     logic and might eventually include interactive or animated elements.
 *   - Step 8 from the plan: "Create common Cinderella components."
 */

"use client"

import * as React from "react"

interface ScoreboardRowProps {
  /**
   * @property rank
   *  The current rank of the user in the scoreboard (1-based).
   */
  rank: number

  /**
   * @property userName
   *  The display name or identifier for the user.
   */
  userName: string

  /**
   * @property score
   *  The user's current score in the Cinderella Bounty game.
   */
  score: number

  /**
   * @property cinderellaTeams
   *  An optional list of the user's Cinderella team picks, if you want to display them.
   *  For now, we just show it as a bullet list or text. This can be expanded later.
   */
  cinderellaTeams?: string[]

  /**
   * @property favoriteTeam
   *  The user's single Favorite pick, if you want to display it.
   */
  favoriteTeam?: string
}

/**
 * @component ScoreboardRow
 * @description
 *   A functional React component that displays rank, userName, and score.
 *   Optionally, also shows team picks for the user. The layout is minimal
 *   but can be adapted or styled further.
 */
export default function ScoreboardRow({
  rank,
  userName,
  score,
  cinderellaTeams = [],
  favoriteTeam
}: ScoreboardRowProps) {
  return (
    <div className="border-muted flex items-center justify-between border-b px-4 py-3 last:border-none">
      {/* Rank + Username + Score */}
      <div className="flex items-center gap-3">
        <span className="w-8 text-center text-xl font-bold">{rank}</span>
        <div className="flex flex-col">
          <span className="font-medium">{userName}</span>
          <span className="text-muted-foreground text-sm">Score: {score}</span>
        </div>
      </div>

      {/* Quick display for picks (optional) */}
      <div className="text-right">
        {cinderellaTeams.length > 0 && (
          <div className="text-sm">
            <span className="font-medium">Cinderella:</span>{" "}
            {cinderellaTeams.join(", ")}
          </div>
        )}

        {favoriteTeam && (
          <div className="text-sm">
            <span className="font-medium">Favorite:</span> {favoriteTeam}
          </div>
        )}
      </div>
    </div>
  )
}
