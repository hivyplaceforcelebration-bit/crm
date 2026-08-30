"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Megaphone, MessageSquare, Users, Plus, Trash2, Send, RefreshCw, Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  getTemplates, saveTemplate, deleteTemplate,
  getCampaigns, saveCampaign, getFilteredCustomers,
  type MessageTemplate, type Campaign, type AudienceFilters, type MarketingCustomer,
} from "@/lib/actions/marketing"

const defaultFilters: AudienceFilters = {
  city: "all",
  spend: "all",
  visitFrequency: "all",
  lastVisit: "all",
  occasions: [],
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("campaigns")
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])

  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [filters, setFilters] = useState<AudienceFilters>(defaultFilters)
  const [audience, setAudience] = useState<MarketingCustomer[]>([])
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [campaignMessage, setCampaignMessage] = useState("")
  const [sending, setSending] = useState(false)

  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: "", body: "", category: "marketing" })
  const [savingTemplate, setSavingTemplate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, t] = await Promise.all([getCampaigns(), getTemplates()])
      setCampaigns(c)
      setTemplates(t)
    } catch {
      toast.error("Failed to load marketing data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const previewAudience = useCallback(async (f: AudienceFilters) => {
    setAudienceLoading(true)
    try {
      const data = await getFilteredCustomers(f)
      setAudience(data)
    } catch {
      toast.error("Failed to load audience")
    } finally {
      setAudienceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showNewCampaign) previewAudience(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewCampaign, filters])

  const resetCampaignForm = () => {
    setCampaignName("")
    setCampaignMessage("")
    setFilters(defaultFilters)
    setAudience([])
  }

  const handleSendCampaign = async () => {
    if (!campaignName.trim() || !campaignMessage.trim()) {
      toast.error("Name and message are required")
      return
    }
    if (audience.length === 0) {
      toast.error("No customers match this audience")
      return
    }
    setSending(true)
    try {
      await saveCampaign({
        name: campaignName,
        message: campaignMessage,
        audience_filter: filters as Record<string, unknown>,
        sent_count: audience.length,
        status: "sent",
      })
      toast.success(`Campaign sent to ${audience.length} customers`)
      setShowNewCampaign(false)
      resetCampaignForm()
      load()
    } catch {
      toast.error("Failed to send campaign")
    } finally {
      setSending(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      toast.error("Name and message body are required")
      return
    }
    setSavingTemplate(true)
    try {
      await saveTemplate(templateForm)
      toast.success("Template saved")
      setShowTemplateDialog(false)
      setTemplateForm({ name: "", body: "", category: "marketing" })
      load()
    } catch {
      toast.error("Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id)
      toast.success("Template deleted")
      load()
    } catch {
      toast.error("Failed to delete template")
    }
  }

  const applyTemplate = (id: string) => {
    const t = templates.find((tpl) => tpl.id === id)
    if (t) setCampaignMessage(t.body)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">Send WhatsApp campaigns and manage message templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showNewCampaign} onOpenChange={(open) => { setShowNewCampaign(open); if (!open) resetCampaignForm() }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New WhatsApp Campaign</DialogTitle>
                <DialogDescription>Build an audience, write a message, and send.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid gap-2">
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g., Diwali Offer 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>

                <div className="grid gap-3">
                  <Label className="text-sm font-medium">Audience Filters</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={filters.city} onValueChange={(v) => setFilters((f) => ({ ...f, city: v }))}>
                      <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        <SelectItem value="Surat">Surat</SelectItem>
                        <SelectItem value="Vadodara">Vadodara</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.spend} onValueChange={(v) => setFilters((f) => ({ ...f, spend: v }))}>
                      <SelectTrigger><SelectValue placeholder="Spend" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Spend</SelectItem>
                        <SelectItem value="high">High (₹50k+)</SelectItem>
                        <SelectItem value="medium">Medium (₹20k–50k)</SelectItem>
                        <SelectItem value="low">Low (&lt;₹20k)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.visitFrequency} onValueChange={(v) => setFilters((f) => ({ ...f, visitFrequency: v }))}>
                      <SelectTrigger><SelectValue placeholder="Visit Frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Frequency</SelectItem>
                        <SelectItem value="frequent">Frequent (5+ visits)</SelectItem>
                        <SelectItem value="regular">Regular (2–4 visits)</SelectItem>
                        <SelectItem value="new">New (1 visit)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.lastVisit} onValueChange={(v) => setFilters((f) => ({ ...f, lastVisit: v }))}>
                      <SelectTrigger><SelectValue placeholder="Last Visit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Time</SelectItem>
                        <SelectItem value="recent">Recent (≤30 days)</SelectItem>
                        <SelectItem value="inactive30">Inactive 30–90 days</SelectItem>
                        <SelectItem value="inactive90">Inactive 90+ days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-sm p-3 bg-muted rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {audienceLoading ? (
                      <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Calculating audience…</span>
                    ) : (
                      <span><strong>{audience.length}</strong> customer{audience.length === 1 ? "" : "s"} match this audience</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Message</Label>
                    {templates.length > 0 && (
                      <Select onValueChange={applyTemplate}>
                        <SelectTrigger className="w-[200px] h-8"><SelectValue placeholder="Use a template…" /></SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Textarea
                    placeholder="Hi {{name}}! Here's a special offer just for you…"
                    rows={5}
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Use <code>{"{{name}}"}</code> to personalize per customer.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewCampaign(false)}>Cancel</Button>
                <Button onClick={handleSendCampaign} disabled={sending || audience.length === 0}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send to {audience.length} Customer{audience.length === 1 ? "" : "s"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign History</CardTitle>
              <CardDescription>WhatsApp campaigns sent to your customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No campaigns sent yet</p>
                  <p className="text-sm">Create your first campaign to reach your customers</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{c.name}</p>
                          <Badge variant="outline" className="text-green-600">{c.channel}</Badge>
                          <Badge variant={c.status === "sent" ? "default" : "secondary"}>{c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.message}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{c.sent_count} sent</p>
                        <p className="text-xs text-muted-foreground">
                          {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Message Templates</h2>
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Message Template</DialogTitle>
                  <DialogDescription>Reusable WhatsApp message for campaigns</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Template Name</Label>
                    <Input
                      placeholder="e.g., Birthday Offer"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={templateForm.category} onValueChange={(v) => setTemplateForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Message Body</Label>
                    <Textarea
                      placeholder="Hi {{name}}! …"
                      rows={5}
                      value={templateForm.body}
                      onChange={(e) => setTemplateForm((f) => ({ ...f, body: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
                  <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                    {savingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No templates yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 capitalize">{t.category}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{t.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
