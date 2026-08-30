"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Types ─────────────────────────────────────────────────────────────────────

export type StaffMember = {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string
  outlet: string
  salary_type: string
  base_salary: number
  joining_date: string
  is_active: boolean
  notes: string | null
  created_at: string
}

export type AttendanceRecord = {
  id: string
  staff_id: string
  date: string
  status: string
  check_in: string | null
  check_out: string | null
  notes: string | null
}

export type PayrollRun = {
  id: string
  month: string
  outlet: string
  total_payable: number
  total_paid: number
  status: string
  created_at: string
  processed_at: string | null
}

export type PayrollEntry = {
  id: string
  payroll_run_id: string
  staff_id: string
  staff_name: string
  base_salary: number
  working_days: number
  days_present: number
  days_absent: number
  days_half: number
  overtime_hours: number
  overtime_amount: number
  bonus: number
  deductions: number
  net_payable: number
  is_paid: boolean
  paid_at: string | null
  payment_method: string | null
}

// ── Staff CRUD ────────────────────────────────────────────────────────────────

export async function getStaff(outlet?: string): Promise<StaffMember[]> {
  const supabase = await createClient()
  let query = supabase
    .from("staff")
    .select("*")
    .order("name")

  if (outlet && outlet !== "all") {
    query = query.or(`outlet.eq.${outlet},outlet.eq.Both`)
  }

  const { data } = await query
  return (data || []) as StaffMember[]
}

export async function createStaff(data: {
  name: string
  phone?: string
  email?: string
  role: string
  outlet: string
  salary_type: string
  base_salary: number
  joining_date?: string
  notes?: string
}): Promise<StaffMember> {
  const supabase = await createClient()
  const { data: staff, error } = await supabase
    .from("staff")
    .insert({ ...data, is_active: true })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/protected/staff")
  return staff as StaffMember
}

export async function updateStaff(
  id: string,
  updates: Partial<StaffMember>
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from("staff").update(updates).eq("id", id)
  if (error) throw error
  revalidatePath("/protected/staff")
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function getAttendanceForDate(
  date: string,
  outlet?: string
): Promise<AttendanceRecord[]> {
  const supabase = await createClient()

  // Get staff IDs for the outlet first
  let staffQ = supabase.from("staff").select("id").eq("is_active", true)
  if (outlet && outlet !== "all") {
    staffQ = staffQ.or(`outlet.eq.${outlet},outlet.eq.Both`)
  }
  const { data: staffRows } = await staffQ
  const staffIds = (staffRows || []).map((s) => s.id)
  if (staffIds.length === 0) return []

  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("date", date)
    .in("staff_id", staffIds)

  return (data || []) as AttendanceRecord[]
}

export async function saveAttendance(
  entries: Array<{
    staffId: string
    date: string
    status: string
    checkIn?: string
    checkOut?: string
    notes?: string
  }>
): Promise<void> {
  const supabase = await createClient()

  const rows = entries.map((e) => ({
    staff_id: e.staffId,
    date: e.date,
    status: e.status,
    check_in: e.checkIn || null,
    check_out: e.checkOut || null,
    notes: e.notes || null,
  }))

  const { error } = await supabase
    .from("attendance")
    .upsert(rows, { onConflict: "staff_id,date" })

  if (error) throw error
  revalidatePath("/protected/staff")
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function getPayroll(
  month: string,
  outlet: string
): Promise<{ run: PayrollRun; entries: PayrollEntry[] } | null> {
  const supabase = await createClient()

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("month", month)
    .eq("outlet", outlet)
    .maybeSingle()

  if (!run) return null

  const { data: entries } = await supabase
    .from("payroll_entries")
    .select("*")
    .eq("payroll_run_id", run.id)
    .order("staff_name")

  return { run: run as PayrollRun, entries: (entries || []) as PayrollEntry[] }
}

export async function generatePayroll(
  month: string,
  outlet: string
): Promise<{ run: PayrollRun; entries: PayrollEntry[] }> {
  const supabase = await createClient()

  const [year, mon] = month.split("-").map(Number)
  const firstDay = new Date(year, mon - 1, 1).toISOString().split("T")[0]
  const lastDay = new Date(year, mon, 0).toISOString().split("T")[0]
  const workingDays = 26

  // Fetch active staff
  let staffQ = supabase
    .from("staff")
    .select("*")
    .eq("is_active", true)
  if (outlet !== "all") {
    staffQ = staffQ.or(`outlet.eq.${outlet},outlet.eq.Both`)
  }
  const { data: staffList } = await staffQ
  const staff = (staffList || []) as StaffMember[]
  if (staff.length === 0) throw new Error("No active staff found")

  const staffIds = staff.map((s) => s.id)

  // Fetch attendance for the month
  const { data: attRows } = await supabase
    .from("attendance")
    .select("staff_id,status")
    .in("staff_id", staffIds)
    .gte("date", firstDay)
    .lte("date", lastDay)

  // Count per staff
  const counts: Record<string, { present: number; half: number; absent: number }> = {}
  staffIds.forEach((id) => { counts[id] = { present: 0, half: 0, absent: 0 } })
  ;(attRows || []).forEach((a) => {
    if (!counts[a.staff_id]) return
    if (a.status === "present") counts[a.staff_id].present++
    else if (a.status === "half_day") counts[a.staff_id].half++
    else if (a.status === "absent") counts[a.staff_id].absent++
  })

  // Compute net payable per staff
  const entryData = staff.map((s) => {
    const c = counts[s.id] || { present: 0, half: 0, absent: 0 }
    const effective = c.present + c.half * 0.5
    const gross =
      s.salary_type === "daily"
        ? s.base_salary * effective
        : (s.base_salary / workingDays) * effective
    const net = Math.round(gross)

    return {
      staff_id: s.id,
      staff_name: s.name,
      base_salary: s.base_salary,
      working_days: workingDays,
      days_present: c.present,
      days_absent: c.absent,
      days_half: c.half,
      overtime_hours: 0,
      overtime_amount: 0,
      bonus: 0,
      deductions: 0,
      net_payable: net,
      is_paid: false,
    }
  })

  const totalPayable = entryData.reduce((s, e) => s + e.net_payable, 0)

  // Upsert payroll_run
  const { data: run } = await supabase
    .from("payroll_runs")
    .upsert(
      { month, outlet, total_payable: totalPayable, status: "processed", processed_at: new Date().toISOString() },
      { onConflict: "month,outlet" }
    )
    .select()
    .single()

  if (!run) throw new Error("Failed to create payroll run")

  // Upsert payroll_entries
  const rowsWithRunId = entryData.map((e) => ({
    ...e,
    payroll_run_id: run.id,
  }))

  await supabase
    .from("payroll_entries")
    .upsert(rowsWithRunId, { onConflict: "payroll_run_id,staff_id" })

  // Return fresh data
  const result = await getPayroll(month, outlet)
  return result!
}

export async function updatePayrollEntry(
  id: string,
  adjustments: { bonus?: number; deductions?: number; overtime_amount?: number; overtime_hours?: number }
): Promise<void> {
  const supabase = await createClient()

  const { data: entry } = await supabase
    .from("payroll_entries")
    .select("base_salary,working_days,days_present,days_half,salary_type")
    .eq("id", id)
    .single()

  if (!entry) throw new Error("Entry not found")

  // Re-compute net with new adjustments
  const { data: staffRow } = await supabase
    .from("payroll_entries")
    .select("base_salary,working_days,days_present,days_half")
    .eq("id", id)
    .single()

  const base = staffRow?.base_salary || 0
  const wd = staffRow?.working_days || 26
  const dp = staffRow?.days_present || 0
  const dh = staffRow?.days_half || 0
  const effective = dp + dh * 0.5
  const gross = (base / wd) * effective
  const bonus = adjustments.bonus ?? 0
  const deductions = adjustments.deductions ?? 0
  const overtime = adjustments.overtime_amount ?? 0
  const net = Math.round(gross + bonus + overtime - deductions)

  const { error } = await supabase
    .from("payroll_entries")
    .update({
      bonus,
      deductions,
      overtime_amount: overtime,
      overtime_hours: adjustments.overtime_hours ?? 0,
      net_payable: net,
    })
    .eq("id", id)

  if (error) throw error

  // Update run total
  const { data: updatedEntry } = await supabase
    .from("payroll_entries")
    .select("payroll_run_id")
    .eq("id", id)
    .single()
  if (updatedEntry) {
    const { data: allEntries } = await supabase
      .from("payroll_entries")
      .select("net_payable,is_paid")
      .eq("payroll_run_id", updatedEntry.payroll_run_id)
    const totalPayable = (allEntries || []).reduce((s, e) => s + (e.net_payable || 0), 0)
    const totalPaid = (allEntries || [])
      .filter((e) => e.is_paid)
      .reduce((s, e) => s + (e.net_payable || 0), 0)
    await supabase
      .from("payroll_runs")
      .update({ total_payable: totalPayable, total_paid: totalPaid })
      .eq("id", updatedEntry.payroll_run_id)
  }

  revalidatePath("/protected/staff")
}

export async function markEntryPaid(
  id: string,
  paymentMethod: string
): Promise<void> {
  const supabase = await createClient()

  const { data: entry, error } = await supabase
    .from("payroll_entries")
    .update({ is_paid: true, paid_at: new Date().toISOString(), payment_method: paymentMethod })
    .eq("id", id)
    .select("payroll_run_id,net_payable")
    .single()

  if (error) throw error

  // Refresh run totals
  const { data: allEntries } = await supabase
    .from("payroll_entries")
    .select("net_payable,is_paid")
    .eq("payroll_run_id", entry.payroll_run_id)

  const totalPaid = (allEntries || [])
    .filter((e) => e.is_paid)
    .reduce((s, e) => s + (e.net_payable || 0), 0)
  const allPaid = (allEntries || []).every((e) => e.is_paid)

  await supabase
    .from("payroll_runs")
    .update({ total_paid: totalPaid, status: allPaid ? "paid" : "processed" })
    .eq("id", entry.payroll_run_id)

  revalidatePath("/protected/staff")
}
