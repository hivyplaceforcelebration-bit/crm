"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus, Minus } from "lucide-react"

interface LoyaltyActionsProps {
  customerId: string
  currentPoints: number
}

export function LoyaltyActions({ customerId, currentPoints }: LoyaltyActionsProps) {
  const [isEarnOpen, setIsEarnOpen] = useState(false)
  const [isRedeemOpen, setIsRedeemOpen] = useState(false)
  const [points, setPoints] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleTransaction = async (type: "earned" | "redeemed") => {
    const pointsValue = Number.parseInt(points)
    if (!pointsValue || pointsValue <= 0) return

    if (type === "redeemed" && pointsValue > currentPoints) {
      alert("Insufficient points")
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    // Calculate new points
    const newPoints = type === "earned" ? currentPoints + pointsValue : currentPoints - pointsValue

    // Update customer points
    const { error: updateError } = await supabase
      .from("customers")
      .update({ loyalty_points: newPoints })
      .eq("id", customerId)

    if (updateError) {
      console.error(updateError)
      setIsLoading(false)
      return
    }

    // Create transaction record
    const { error: transactionError } = await supabase.from("loyalty_transactions").insert({
      customer_id: customerId,
      points: type === "earned" ? pointsValue : -pointsValue,
      type,
      description: description || `Points ${type}`,
    })

    if (transactionError) {
      console.error(transactionError)
    }

    setIsLoading(false)
    setPoints("")
    setDescription("")
    setIsEarnOpen(false)
    setIsRedeemOpen(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <Dialog open={isEarnOpen} onOpenChange={setIsEarnOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            Award
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Loyalty Points</DialogTitle>
            <DialogDescription>Add points to the customer's loyalty balance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="earn-points">Points to Award</Label>
              <Input
                id="earn-points"
                type="number"
                placeholder="50"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earn-description">Description (optional)</Label>
              <Input
                id="earn-description"
                placeholder="Purchase reward"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={() => handleTransaction("earned")} disabled={isLoading} className="w-full">
              {isLoading ? "Processing..." : "Award Points"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            <Minus className="h-4 w-4 mr-1" />
            Redeem
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Loyalty Points</DialogTitle>
            <DialogDescription>
              Subtract points from the customer's loyalty balance (Available: {currentPoints} pts)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="redeem-points">Points to Redeem</Label>
              <Input
                id="redeem-points"
                type="number"
                placeholder="25"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redeem-description">Description (optional)</Label>
              <Input
                id="redeem-description"
                placeholder="Free coffee redemption"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={() => handleTransaction("redeemed")} disabled={isLoading} className="w-full">
              {isLoading ? "Processing..." : "Redeem Points"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
