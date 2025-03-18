/**
 * @file auction-view.tsx (Client Component)
 * @description
 *   Renders a list of auctions, each with an interface to place a new bid.
 *   Polls or refreshes auctions state periodically. For now, we do a simple
 *   approach: the auctions data is initially loaded by the server page, and
 *   we rely on user-initiated refresh or a small polling function to keep it
 *   current. Could be upgraded to a real-time solution (e.g., Supabase Realtime).
 *
 * @props
 *   - auctions: an array of auctions, each with {id, status, winnerUserId, team: {name,seed}, ...}
 *   - placeBidServerAction(auctionId: string, amount: number): Promise<{isSuccess, message}>
 */

"use client"

import * as React from "react"
import { SelectAuction } from "@/db/schema/cinderella-schema"
import { Button } from "@/components/ui/button"

/**
 * @interface AuctionWithTeam
 * @extends SelectAuction
 * @description
 *   The shape of an auction plus a "team" field containing name and seed, for display.
 */
interface AuctionWithTeam extends SelectAuction {
  team: {
    id: string
    name: string
    seed: number
  } | null
}

/**
 * @interface AuctionViewProps
 * @description
 *   Props for the AuctionView client component.
 */
interface AuctionViewProps {
  /**
   * @property auctions
   *   An array of AuctionWithTeam objects the server retrieved.
   */
  auctions: AuctionWithTeam[]

  /**
   * @property placeBidServerAction
   *   A callback to the local server action that calls the placeBidAction in cinderella-actions.
   */
  placeBidServerAction: (
    auctionId: string,
    amount: number
  ) => Promise<{ isSuccess: boolean; message: string }>
}

/**
 * @component AuctionView
 * @description
 *   Displays a list of auctions. For each auction, we let the user place a new bid.
 *   We do minimal polling or refresh logic (commented out below).
 */
export default function AuctionView({
  auctions,
  placeBidServerAction
}: AuctionViewProps) {
  const [auctionList, setAuctionList] =
    React.useState<AuctionWithTeam[]>(auctions)
  const [bidInputs, setBidInputs] = React.useState<Record<string, string>>({})
  const [feedback, setFeedback] = React.useState<string>("")

  // Optional: simple polling approach for updated auctions (commented out).
  // React.useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     // Re-fetch from an API route or the server component using a GET endpoint.
  //     // For now, we do nothing.
  //   }, 10_000) // poll every 10 sec
  //   return () => clearInterval(intervalId)
  // }, [])

  /**
   * @function handlePlaceBid
   * @description
   *   Called when user clicks "Place Bid" for a given auction ID.
   *   Uses placeBidServerAction to place the bid, then sets feedback for display.
   */
  const handlePlaceBid = async (auctionId: string) => {
    const amountString = bidInputs[auctionId]
    if (!amountString) {
      setFeedback("Please enter a bid amount.")
      return
    }
    const amount = parseFloat(amountString)
    if (isNaN(amount) || amount <= 0) {
      setFeedback("Please enter a valid positive number for your bid.")
      return
    }

    try {
      const result = await placeBidServerAction(auctionId, amount)
      setFeedback(result.message)

      // You might re-fetch the updated auctions here if the bid was successful
      if (result.isSuccess) {
        // TODO: Re-fetch or update state to reflect the new highest bid.
        // We'll just do a console.log for now.
        console.log("Bid placed, you can now refresh or re-fetch auctions.")
      }
    } catch (error) {
      console.error("Error placing bid:", error)
      setFeedback("An error occurred while placing your bid.")
    }
  }

  return (
    <div className="space-y-8">
      {auctionList.length === 0 && (
        <p className="text-muted-foreground text-center">
          No relevant auctions found.
        </p>
      )}

      {auctionList.map(auction => (
        <div
          key={auction.id}
          className="border-muted flex flex-col gap-2 rounded-md border p-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Team: {auction.team?.name || "Unknown"} (Seed{" "}
                {auction.team?.seed})
              </h2>
              <p className="text-muted-foreground text-sm">
                Auction Status:{" "}
                <span className="uppercase">{auction.status}</span>
              </p>
              {auction.winnerUserId && auction.status === "closed" && (
                <p className="text-sm">
                  Winner:{" "}
                  <span className="font-medium">{auction.winnerUserId}</span>{" "}
                  for ${auction.finalBidAmount?.toString()}
                </p>
              )}
            </div>

            {/* Place bid fields if auction is not closed */}
            {(auction.status === "open" || auction.status === "scheduled") && (
              <div className="mt-2 flex items-center gap-2 sm:mt-0">
                <input
                  type="number"
                  min={1}
                  placeholder="Enter Bid"
                  className="focus:border-primary w-32 rounded-md border px-2 py-1 text-sm outline-none"
                  value={bidInputs[auction.id] || ""}
                  onChange={e =>
                    setBidInputs(prev => ({
                      ...prev,
                      [auction.id]: e.target.value
                    }))
                  }
                />
                <Button onClick={() => handlePlaceBid(auction.id)}>
                  Place Bid
                </Button>
              </div>
            )}
          </div>

          {/* Show final bid amount if closed */}
          {auction.status === "closed" && !auction.winnerUserId && (
            <p className="text-destructive text-sm">
              Auction closed with no bids. Team remains unowned.
            </p>
          )}
        </div>
      ))}

      {feedback && (
        <div className="bg-muted text-foreground mt-4 rounded-md p-3 text-sm">
          {feedback}
        </div>
      )}
    </div>
  )
}
