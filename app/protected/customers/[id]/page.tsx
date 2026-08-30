import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Star } from "lucide-react"
import Link from "next/link"
import { LoyaltyActions } from "@/components/loyalty-actions"

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Fetch customer data
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single()

  if (!customer) {
    redirect("/protected/customers")
  }

  // Fetch customer orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })

  // Fetch loyalty transactions
  const { data: loyaltyTransactions } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })

  // Fetch feedback
  const { data: feedback } = await supabase
    .from("feedback")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <DashboardHeader user={user} />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/protected/customers">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
              <p className="text-muted-foreground">Customer details and history</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                  <p className="text-2xl font-bold">{customer.total_visits}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orders?.length || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loyalty Points</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold text-accent">{customer.loyalty_points}</p>
                </div>
                <LoyaltyActions customerId={id} currentPoints={customer.loyalty_points} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Order history for this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {!orders || orders.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <p className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={order.status === "completed" ? "default" : "outline"}>{order.status}</Badge>
                          <p className="font-semibold">₹{Number(order.total_amount).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loyalty Transactions</CardTitle>
                <CardDescription>Points earned and redeemed</CardDescription>
              </CardHeader>
              <CardContent>
                {!loyaltyTransactions || loyaltyTransactions.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {loyaltyTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Badge variant={transaction.type === "earned" ? "default" : "secondary"}>
                            {transaction.type === "earned" ? "+" : "-"}
                            {Math.abs(transaction.points)} pts
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Feedback</CardTitle>
              <CardDescription>Reviews and ratings from this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {!feedback || feedback.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No feedback yet</p>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div key={item.id} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < (item.rating || 0) ? "fill-accent text-accent" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.comment && <p className="text-sm">{item.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
