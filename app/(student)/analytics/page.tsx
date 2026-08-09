'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Layers, CheckCircle2, Clock, AlertTriangle, Loader2, BarChart2 } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Badge } from '@/components/shared/ui/badge'

const TYPE_LABELS: Record<string, string> = {
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  sentence: 'Mẫu câu',
}

const TYPE_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--border))']

const MASTERY_COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning-fg))', 'hsl(var(--warning-fg))', 'hsl(var(--success-fg))', 'hsl(var(--primary))', 'hsl(var(--primary))', 'hsl(var(--primary))']

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-detail'],
    queryFn: async () => {
      const res = await fetch('/api/v1/analytics/progress?detail=true')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json() as Promise<{
        summary: { total: number; mastered: number; inProgress: number; due: number }
        byType: Array<{ loType: string; total: number; mastered: number; inProgress: number; due: number }>
        masteryDistribution: Array<{ range: string; min: number; count: number }>
        retrievabilityDistribution: Array<{ range: string; min: number; count: number }>
      }>
    },
    staleTime: 120 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs font-black text-primary uppercase tracking-widest">Đang tính toán phân tích tiến độ học...</p>
      </div>
    )
  }

  if (!data) return null

  const { summary, byType, masteryDistribution, retrievabilityDistribution } = data

  return (
    <DevOnlyGuard featureName="Phân Tích Tiến Độ AI">
      <div className="w-full py-8 space-y-8">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-[32px] bg-card/80 backdrop-blur-2xl p-8 md:p-10 border border-border shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transform-gpu" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">FSRS Learning Analytics</p>
                <h1 className="text-2xl md:text-3xl font-black text-card-foreground tracking-tight">Phân Tích Tiến Độ Học Tập</h1>
              </div>
            </div>
          </div>

          <Badge className="bg-primary text-primary-foreground border-none px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20">
            Tổng {summary.total} thẻ học
          </Badge>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số mục học', value: summary.total, icon: Layers, color: 'text-foreground', bg: 'bg-surface-card border-subtle' },
          { label: 'Đã thành thạo', value: summary.mastered, icon: CheckCircle2, color: 'text-learning-mastered-fg', bg: 'bg-learning-mastered-bg border-learning-mastered-border' },
          { label: 'Đang học tập', value: summary.inProgress, icon: Clock, color: 'text-learning-progress-fg', bg: 'bg-learning-progress-bg border-learning-progress-border' },
          { label: 'Đến hạn ôn tập', value: summary.due, icon: AlertTriangle, color: 'text-learning-review-fg', bg: 'bg-learning-review-bg border-learning-review-border' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className={`rounded-3xl border ${card.bg} backdrop-blur-2xl shadow-xs hover:shadow-md transition-all`}>
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-2">
                <Icon className={`w-5 h-5 ${card.color}`} />
                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">{card.label}</span>
                <span className={`text-3xl font-black ${card.color} tracking-tight`}>{card.value}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Learning Type */}
        <Card className="rounded-[32px] border border-border bg-card/80 backdrop-blur-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-card-foreground uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Phân bố loại bài học
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byType.map((t) => ({ ...t, name: TYPE_LABELS[t.loType] ?? t.loType }))}>
              <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 700 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: 'hsl(var(--card-foreground))', fontWeight: 'bold' }}
              />
              <Bar dataKey="total" name="Tổng" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="mastered" name="Thành thạo" fill="hsl(var(--success-fg))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="inProgress" name="Đang học" fill="hsl(var(--warning-fg))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Mastery Distribution */}
        <Card className="rounded-[32px] border border-border bg-card/80 backdrop-blur-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-card-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Mức độ thuộc bài (Mastery)
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={masteryDistribution}>
              <XAxis dataKey="range" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: 'hsl(var(--card-foreground))', fontWeight: 'bold' }}
              />
              <Bar dataKey="count" name="Số thẻ" radius={[6, 6, 0, 0]}>
                {masteryDistribution.map((_, i) => (
                  <Cell key={i} fill={MASTERY_COLORS[i % MASTERY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Memory Retrievability & Progress Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[32px] border border-border bg-card/80 backdrop-blur-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-black text-card-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Khả năng gợi nhớ (Đường cong quên)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={retrievabilityDistribution}>
              <XAxis dataKey="range" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: 'hsl(var(--card-foreground))', fontWeight: 'bold' }}
              />
              <Bar dataKey="count" name="Số mục" radius={[6, 6, 0, 0]}>
                {retrievabilityDistribution.map((_, i) => {
                  const frac = i / Math.max(retrievabilityDistribution.length - 1, 1)
                  const r = Math.round(93 + 100 * (1 - frac))
                  const g = Math.round(123 + 50 * frac)
                  return <Cell key={i} fill={`rgb(${r}, ${g}, 111)`} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="rounded-[32px] border border-border bg-card/80 backdrop-blur-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-base font-black text-card-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Chi tiết theo loại
          </h2>
          <div className="space-y-5">
            {byType.map((t) => (
              <div key={t.loType} className="space-y-1.5">
                <div className="flex justify-between text-xs font-black uppercase tracking-wider">
                  <span className="text-primary">{TYPE_LABELS[t.loType] ?? t.loType}</span>
                  <span className="text-muted-foreground">{t.total} mục</span>
                </div>
                <div className="flex gap-1 h-3.5 bg-muted rounded-full p-0.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 rounded-full transition-all"
                    style={{ flex: Math.max(t.mastered, 0.01) }}
                    title={`Thành thạo: ${t.mastered}`}
                  />
                  <div
                    className="bg-amber-500 rounded-full transition-all"
                    style={{ flex: Math.max(t.inProgress, 0.01) }}
                    title={`Đang học: ${t.inProgress}`}
                  />
                  <div
                    className="bg-muted-foreground/30 rounded-full transition-all"
                    style={{ flex: Math.max(t.total - t.mastered - t.inProgress, 0.01) }}
                    title={`Chưa học: ${t.total - t.mastered - t.inProgress}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>{t.mastered} thành thạo</span>
                  <span>{t.inProgress} đang học</span>
                  <span>{t.due} đến hạn</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </DevOnlyGuard>
  )
}
