/**
 * @file pick-teams-form.tsx (Client Component)
 * @description
 *   Renders a user interface allowing participants to choose exactly
 *   3 Cinderella seeds (9–16) and 1 Favorite seed (1–4). The final submission
 *   triggers a server action passed from the parent server component.
 *
 * @props
 *   cinderellaTeams - array of teams with seeds 9–16
 *   favoriteTeams   - array of teams with seeds 1–4
 *   onSubmitPickTeams - callback prop that calls the server action
 *
 * @notes
 *   - Basic client-side validation helps guide the user, but final validation
 *     also happens on the server in createUserPicksAction.
 *   - The "onSubmitPickTeams" function returns a success or error message,
 *     which we display below the form.
 */

"use client"

import * as React from "react"
import { SelectTeam } from "@/db/schema/cinderella-schema"
import { Button } from "@/components/ui/button"

interface PickTeamsFormProps {
  /**
   * @property cinderellaTeams
   *   An array of team objects (id, name, seed = 9..16).
   */
  cinderellaTeams: SelectTeam[]

  /**
   * @property favoriteTeams
   *   An array of team objects (id, name, seed = 1..4).
   */
  favoriteTeams: SelectTeam[]

  /**
   * @property onSubmitPickTeams
   *   A callback prop that sends the array of team IDs to a local server action
   *   in page.tsx, which in turn calls createUserPicksAction in cinderella-actions.
   */
  onSubmitPickTeams: (teamIds: string[]) => Promise<{
    isSuccess: boolean
    message: string
  }>
}

/**
 * @component PickTeamsForm
 * @description
 *   Displays a form for selecting exactly 3 Cinderella teams and 1 Favorite team.
 *   The user can confirm and submit, triggering the server action.
 */
export default function PickTeamsForm({
  cinderellaTeams,
  favoriteTeams,
  onSubmitPickTeams
}: PickTeamsFormProps) {
  // The user picks up to 3 cinderellas
  const [selectedCinderellas, setSelectedCinderellas] = React.useState<
    string[]
  >([])

  // The user picks exactly 1 favorite
  const [selectedFavorite, setSelectedFavorite] = React.useState<string | null>(
    null
  )

  // Keep track of error or success messages
  const [submissionMessage, setSubmissionMessage] = React.useState<string>("")
  const [isSuccess, setIsSuccess] = React.useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)

  /**
   * @function handleSelectCinderella
   * @description Toggles or adds a cinderella team ID in the selected array.
   */
  const handleSelectCinderella = (teamId: string) => {
    setSelectedCinderellas(prev => {
      // If already included, remove it
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId)
      }
      // Otherwise, add it (up to 3)
      if (prev.length < 3) {
        return [...prev, teamId]
      }
      // If user tries to add beyond 3, we ignore or show a small alert
      alert("You can only pick 3 Cinderella teams!")
      return prev
    })
  }

  /**
   * @function handleSelectFavorite
   * @description Sets the selected favorite to a single team ID.
   */
  const handleSelectFavorite = (teamId: string) => {
    setSelectedFavorite(prev => (prev === teamId ? null : teamId))
  }

  /**
   * @function handleSubmit
   * @description
   *   Gathers the selected team IDs, ensures we have exactly 3 cinderellas
   *   and 1 favorite, then calls the onSubmitPickTeams prop to run the server action.
   */
  const handleSubmit = async () => {
    if (selectedCinderellas.length !== 3) {
      setSubmissionMessage("Please select exactly 3 Cinderella teams.")
      setIsSuccess(false)
      return
    }

    if (!selectedFavorite) {
      setSubmissionMessage("Please select exactly 1 Favorite team.")
      setIsSuccess(false)
      return
    }

    // Combine all picks
    const picks = [...selectedCinderellas, selectedFavorite]

    try {
      setIsSubmitting(true)
      setSubmissionMessage("")
      setIsSuccess(null)

      const result = await onSubmitPickTeams(picks)
      setSubmissionMessage(result.message)
      setIsSuccess(result.isSuccess)
    } catch (error: any) {
      console.error("Error submitting picks:", error)
      setSubmissionMessage(
        error?.message ||
          "Something went wrong submitting your picks. Please try again."
      )
      setIsSuccess(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cinderella Teams */}
      <div>
        <h2 className="mb-2 text-xl font-semibold">
          Select 3 Cinderella Teams
        </h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {cinderellaTeams.map(team => {
            const isSelected = selectedCinderellas.includes(team.id)
            return (
              <div
                key={team.id}
                onClick={() => handleSelectCinderella(team.id)}
                className={`cursor-pointer rounded-md border p-2 text-center ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "hover:border-muted"
                }`}
              >
                <div className="font-medium">
                  {team.name} ({team.seed})
                </div>
                {isSelected && (
                  <p className="text-primary-foreground text-sm">Selected</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Favorite Teams */}
      <div>
        <h2 className="mb-2 text-xl font-semibold">Select 1 Favorite Team</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {favoriteTeams.map(team => {
            const isSelected = selectedFavorite === team.id
            return (
              <div
                key={team.id}
                onClick={() => handleSelectFavorite(team.id)}
                className={`cursor-pointer rounded-md border p-2 text-center ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "hover:border-muted"
                }`}
              >
                <div className="font-medium">
                  {team.name} ({team.seed})
                </div>
                {isSelected && (
                  <p className="text-primary-foreground text-sm">Selected</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Submission Button + Feedback */}
      <div className="flex flex-col items-center space-y-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2"
        >
          {isSubmitting ? "Submitting..." : "Submit Picks"}
        </Button>

        {submissionMessage && (
          <div
            className={`rounded-md px-4 py-2 ${
              isSuccess
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {submissionMessage}
          </div>
        )}
      </div>
    </div>
  )
}
