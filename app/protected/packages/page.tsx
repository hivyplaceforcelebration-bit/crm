"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus, Search, MoreHorizontal, Star, Clock, Users, IndianRupee,
  Edit, Trash2, Eye, Package, Sparkles, RefreshCw, MapPin,
} from "lucide-react"
import { useBrand } from "@/hooks/use-brand"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  getPackages, getAddOns, createPackage, updatePackage, deletePackage,
  togglePackageActive, togglePackageHighlight,
  createAddOn, toggleAddOnActive, deleteAddOn,
  type Package as PkgType, type AddOn,
} from "@/lib/actions/packages"
import { toast } from "sonner"

const experienceEmoji: Record<string, string> = {
  candlelight: "🕯️",
  birthday: "🎂",
  anniversary: "💑",
  proposal: "💍",
  private_celebration: "🎉",
}

const addOnTypeColors: Record<string, string> = {
  decor:   "bg-pink-100 text-pink-800",
  food:    "bg-orange-100 text-orange-800",
  service: "bg-blue-100 text-blue-800",
  time:    "bg-green-100 text-green-800",
}

const defaultPkgForm = {
  name: "", short_description: "", base_price: 0, max_people: 2,
  duration_minutes: 120, experience_type: "candlelight", inclusions: "", outlet: "Surat",
}

const defaultAddOnForm = { name: "", price: 0, type: "service" }

export default function PackagesPage() {
  const { activeCity, isReady } = useBrand()
  const [packages, setPackages] = useState<PkgType[]>([])
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [outletFilter, setOutletFilter] = useState("all")
  const [showPkgDialog, setShowPkgDialog] = useState(false)
  const [showAddOnDialog, setShowAddOnDialog] = useState(false)
  const [editingPkg, setEditingPkg] = useState<PkgType | null>(null)
  const [pkgForm, setPkgForm] = useState(defaultPkgForm)
  const [addOnForm, setAddOnForm] = useState(defaultAddOnForm)
  const [saving, setSaving] = useState(false)

  // Sync with global activeCity
  useEffect(() => {
    if (isReady) {
      setOutletFilter(activeCity)
      setPkgForm((f) => ({
        ...f,
        outlet: activeCity === "all" ? "Surat" : activeCity
      }))
    }
  }, [activeCity, isReady])

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const [pkgs, addons] = await Promise.all([getPackages({ outlet: outletFilter }), getAddOns()])
      setPackages(pkgs)
      setAddOns(addons)
    } catch {
      toast.error("Failed to load packages")
    } finally {
      setLoading(false)
    }
  }, [outletFilter, isReady])

  useEffect(() => { load() }, [load])

  const filteredPackages = packages.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredAddOns = addOns.filter((a) =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openEditPkg = (pkg: PkgType) => {
    setEditingPkg(pkg)
    setPkgForm({
      name: pkg.name,
      short_description: pkg.short_description || "",
      base_price: pkg.base_price,
      max_people: pkg.max_people,
      duration_minutes: pkg.duration_minutes,
      experience_type: pkg.experience_type,
      inclusions: pkg.inclusions.join(", "),
      outlet: pkg.outlet || "Surat",
    })
    setShowPkgDialog(true)
  }

  const handleSavePkg = async () => {
    if (!pkgForm.name || !pkgForm.base_price) {
      toast.error("Name and price are required")
      return
    }
    setSaving(true)
    try {
      const inclusions = pkgForm.inclusions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      if (editingPkg) {
        await updatePackage(editingPkg.id, { ...pkgForm, inclusions })
        toast.success("Package updated!")
      } else {
        await createPackage({ ...pkgForm, inclusions })
        toast.success("Package created!")
      }
      setShowPkgDialog(false)
      setEditingPkg(null)
      setPkgForm(defaultPkgForm)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to save package")
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePkg = async (id: string) => {
    if (!confirm("Delete this package?")) return
    try {
      await deletePackage(id)
      toast.success("Package deleted")
      load()
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleSaveAddOn = async () => {
    if (!addOnForm.name || !addOnForm.price) {
      toast.error("Name and price are required")
      return
    }
    setSaving(true)
    try {
      await createAddOn(addOnForm)
      toast.success("Add-on created!")
      setShowAddOnDialog(false)
      setAddOnForm(defaultAddOnForm)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to create add-on")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Packages & Add-ons</h1>
          <p className="text-muted-foreground">Manage your experience packages and add-on services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={showPkgDialog} onOpenChange={(o) => { setShowPkgDialog(o); if (!o) { setEditingPkg(null); setPkgForm(defaultPkgForm) } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPkg ? "Edit Package" : "New Package"}</DialogTitle>
                <DialogDescription>Fill in the package details</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                  <Label>Package Name *</Label>
                  <Input value={pkgForm.name} onChange={(e) => setPkgForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Classic Candlelight Dinner" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Short Description</Label>
                  <Textarea value={pkgForm.short_description} onChange={(e) => setPkgForm((f) => ({ ...f, short_description: e.target.value }))} placeholder="Brief description..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Base Price (₹) *</Label>
                    <Input type="number" value={pkgForm.base_price} onChange={(e) => setPkgForm((f) => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Max People</Label>
                    <Input type="number" value={pkgForm.max_people} onChange={(e) => setPkgForm((f) => ({ ...f, max_people: parseInt(e.target.value) || 2 }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Duration (mins)</Label>
                    <Input type="number" value={pkgForm.duration_minutes} onChange={(e) => setPkgForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 120 }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Experience Type</Label>
                    <Select value={pkgForm.experience_type} onValueChange={(v) => setPkgForm((f) => ({ ...f, experience_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candlelight">🕯️ Candlelight</SelectItem>
                        <SelectItem value="birthday">🎂 Birthday</SelectItem>
                        <SelectItem value="anniversary">💑 Anniversary</SelectItem>
                        <SelectItem value="proposal">💍 Proposal</SelectItem>
                        <SelectItem value="private_celebration">🎉 Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Outlet *</Label>
                  <Select value={pkgForm.outlet} onValueChange={(v) => setPkgForm((f) => ({ ...f, outlet: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Surat">Surat (Hivy)</SelectItem>
                      <SelectItem value="Vadodara">Vadodara (Friends Factory)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Inclusions (comma separated)</Label>
                  <Textarea value={pkgForm.inclusions} onChange={(e) => setPkgForm((f) => ({ ...f, inclusions: e.target.value }))} placeholder="Decorated table, 2 Mocktails, 3-course meal..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPkgDialog(false)}>Cancel</Button>
                <Button onClick={handleSavePkg} disabled={saving}>{saving ? "Saving..." : (editingPkg ? "Update" : "Create")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search packages or add-ons..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {activeCity === "all" && (
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-[150px]">
              <MapPin className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="Surat">Surat</SelectItem>
              <SelectItem value="Vadodara">Vadodara</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">
            <Package className="mr-2 h-4 w-4" />Packages ({packages.length})
          </TabsTrigger>
          <TabsTrigger value="addons">
            <Sparkles className="mr-2 h-4 w-4" />Add-ons ({addOns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading packages...
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => (
                <Card key={pkg.id} className={pkg.is_highlighted ? "border-primary" : ""}>
                  {pkg.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pkg.image_url}
                      alt={pkg.name}
                      className="h-40 w-full rounded-t-xl object-cover"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{experienceEmoji[pkg.experience_type] || "✨"}</span>
                        {pkg.is_highlighted && (
                          <Badge variant="default" className="bg-primary">
                            <Star className="mr-1 h-3 w-3" />Featured
                          </Badge>
                        )}
                        {activeCity === "all" && pkg.outlet && (
                          <Badge variant="outline">
                            <MapPin className="mr-1 h-3 w-3" />{pkg.outlet}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPkg(pkg)}>
                            <Edit className="mr-2 h-4 w-4" />Edit Package
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePackageHighlight(pkg.id, !pkg.is_highlighted).then(load)}>
                            <Star className="mr-2 h-4 w-4" />
                            {pkg.is_highlighted ? "Remove Featured" : "Mark Featured"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePkg(pkg.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.short_description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{pkg.duration_minutes} min</span>
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" />Max {pkg.max_people}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pkg.inclusions.slice(0, 4).map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                      ))}
                      {pkg.inclusions.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{pkg.inclusions.length - 4} more</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-muted-foreground">{pkg.bookings_count} bookings</div>
                      <div className="text-xl font-bold flex items-center">
                        <IndianRupee className="h-4 w-4" />{pkg.base_price.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pkg.is_active}
                          onCheckedChange={(v) => togglePackageActive(pkg.id, v).then(load)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {pkg.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openEditPkg(pkg)}>Edit</Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="addons" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Add-on Services</CardTitle>
                <CardDescription>Extra services that can be added to any package</CardDescription>
              </div>
              <Dialog open={showAddOnDialog} onOpenChange={setShowAddOnDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add New</Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>New Add-on</DialogTitle>
                    <DialogDescription>Create a new add-on service</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-1.5">
                      <Label>Name *</Label>
                      <Input value={addOnForm.name} onChange={(e) => setAddOnForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rose Bouquet" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Price (₹) *</Label>
                      <Input type="number" value={addOnForm.price} onChange={(e) => setAddOnForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Type</Label>
                      <Select value={addOnForm.type} onValueChange={(v) => setAddOnForm((f) => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="decor">Décor</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="time">Time Extension</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddOnDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveAddOn} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Add-on Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAddOns.map((addon) => (
                      <TableRow key={addon.id}>
                        <TableCell className="font-medium">{addon.name}</TableCell>
                        <TableCell>
                          <Badge className={addOnTypeColors[addon.type] || ""}>{addon.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center">
                            <IndianRupee className="h-3 w-3" />{addon.price}
                          </span>
                        </TableCell>
                        <TableCell>{addon.bookings_count}</TableCell>
                        <TableCell>
                          <Switch
                            checked={addon.is_active}
                            onCheckedChange={(v) => toggleAddOnActive(addon.id, v).then(load)}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteAddOn(addon.id).then(load)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
