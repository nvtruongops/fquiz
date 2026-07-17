'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TYPE_LABELS: Record<string, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  sentence: 'Sentences',
}

const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7']

const MASTERY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#8b5cf6']

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
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const { summary, byType, masteryDistribution, retrievabilityDistribution } = data

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold">Learning Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: summary.total, color: 'text-blue-400' },
          { label: 'Mastered', value: summary.mastered, color: 'text-green-400' },
          { label: 'In Progress', value: summary.inProgress, color: 'text-yellow-400' },
          { label: 'Due for Review', value: summary.due, color: 'text-red-400' },
        ].map((card) => (
          <div key={card.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">By Learning Type</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byType.map((t) => ({ ...t, name: TYPE_LABELS[t.loType] ?? t.loType }))}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="mastered" name="Mastered" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inProgress" name="In Progress" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Mastery Distribution</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={masteryDistribution}>
              <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Bar dataKey="count" name="Items" radius={[4, 4, 0, 0]}>
                {masteryDistribution.map((_, i) => (
                  <Cell key={i} fill={MASTERY_COLORS[i % MASTERY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Number of items at each mastery level range
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Retrievability (Forgetting Curve)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={retrievabilityDistribution}>
              <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Bar dataKey="count" name="Items" radius={[4, 4, 0, 0]}>
                {retrievabilityDistribution.map((_, i) => {
                  const frac = i / (retrievabilityDistribution.length - 1)
                  const r = Math.round(255 * frac)
                  const g = Math.round(70 + 120 * (1 - frac))
                  return <Cell key={i} fill={`rgb(${r}, ${g}, 180)`} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Items grouped by memory retrievability (low R = forgotten, high R = well remembered)
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <div className="space-y-4">
            {byType.map((t, i) => (
              <div key={t.loType}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: TYPE_COLORS[i] }}>{TYPE_LABELS[t.loType] ?? t.loType}</span>
                  <span className="text-gray-400">{t.total} items</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div
                    className="bg-green-500 rounded-l-full transition-all"
                    style={{ flex: t.mastered || 0.01 }}
                    title={`Mastered: ${t.mastered}`}
                  />
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{ flex: Math.max(t.inProgress, 0.01) }}
                    title={`In Progress: ${t.inProgress}`}
                  />
                  <div
                    className="bg-gray-600 rounded-r-full transition-all"
                    style={{ flex: Math.max(t.total - t.mastered - t.inProgress, 0.01) }}
                    title={`Not Started: ${t.total - t.mastered - t.inProgress}`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                  <span>{t.mastered} mastered</span>
                  <span>{t.inProgress} in progress</span>
                  <span>{t.due} due</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
