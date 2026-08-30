import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coffee, ShieldOff } from "lucide-react"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-secondary/30">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <Coffee className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-primary">Friends Factory</h1>
            </div>
            <p className="text-sm text-muted-foreground">Cafe Management System</p>
          </div>
          <Card>
            <CardHeader className="items-center text-center">
              <ShieldOff className="h-8 w-8 text-muted-foreground mb-1" />
              <CardTitle className="text-xl">Self sign-up is disabled</CardTitle>
              <CardDescription>
                Staff accounts are created by an administrator. Contact your admin to get access, or sign in below if you already have an account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/auth/login">Back to Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
