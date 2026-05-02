'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryStatus {
  category_id: string
  category_name: string
  status: 'not_migrated' | 'partial' | 'synced'
  total_quizzes: number
  total_bank_questions: number
  migrated_quiz_codes: string[]
  not_migrated_quiz_codes: string[]
}

interface StatusData {
  total_categories: number
  not_migrated: number
  partial: number
  synced: number
  categories: CategoryStatus[]
}

export function QuestionBankStatus() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StatusData | null>(null)
  const [filter, setFilter] = useState<'all' | 'not_migrated' | 'partial' | 'synced'>('all')

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/question-bank/status', {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = data?.categories.filter(c =>
    filter === 'all' ? true : c.status === filter
  ) ?? []

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'not_migrated' ? 'all' : 'not_migrated')}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            filter === 'not_migrated'
              ? "border-red-400 bg-red-50"
              : "border-red-200 bg-white hover:bg-red-50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold text-red-700">Chưa migration</span>
          </div>
          <p className="text-3xl font-black text-red-600">{data?.not_migrated ?? '—'}</p>
          <p className="text-xs text-red-500 mt-1">môn học</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'partial' ? 'all' : 'partial')}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            filter === 'partial'
              ? "border-orange-400 bg-orange-50"
              : "border-orange-200 bg-white hover:bg-orange-50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-700">Có quiz mới</span>
          </div>
          <p className="text-3xl font-black text-orange-600">{data?.partial ?? '—'}</p>
          <p className="text-xs text-orange-500 mt-1">môn học</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'synced' ? 'all' : 'synced')}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            filter === 'synced'
              ? "border-green-400 bg-green-50"
              : "border-green-200 bg-white hover:bg-green-50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-bold text-green-700">Đã đồng bộ</span>
          </div>
          <p className="text-3xl font-black text-green-600">{data?.synced ?? '—'}</p>
          <p className="text-xs text-green-500 mt-1">môn học</p>
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filter === 'all' && `Tất cả môn học (${data?.total_categories ?? 0})`}
              {filter === 'not_migrated' && `Chưa migration (${data?.not_migrated ?? 0})`}
              {filter === 'partial' && `Có quiz mới chưa migration (${data?.partial ?? 0})`}
              {filter === 'synced' && `Đã đồng bộ (${data?.synced ?? 0})`}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchStatus}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />
              }
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Không có môn học nào
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map(cat => (
                <CategoryRow key={cat.category_id} category={cat} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CategoryRow({ category }: { category: CategoryStatus }) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    not_migrated: {
      icon: <XCircle className="w-4 h-4 text-red-500" />,
      badge: <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Chưa migration</Badge>,
      bg: 'border-red-200 bg-red-50/50',
    },
    partial: {
      icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
      badge: <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">Có quiz mới</Badge>,
      bg: 'border-orange-200 bg-orange-50/50',
    },
    synced: {
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      badge: <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Đã đồng bộ</Badge>,
      bg: 'border-green-200 bg-green-50/50',
    },
  }

  const config = statusConfig[category.status]

  return (
    <div className={cn("border rounded-lg overflow-hidden", config.bg)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-black/5 transition-colors"
      >
        {config.icon}
        <span className="font-semibold text-gray-900 flex-1">{category.category_name}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {category.total_quizzes} quiz • {category.total_bank_questions} câu trong ngân hàng
          </span>
          {config.badge}
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-black/10 space-y-3">
          {/* Not migrated quizzes */}
          {category.not_migrated_quiz_codes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Chưa migration ({category.not_migrated_quiz_codes.length} mã quiz):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.not_migrated_quiz_codes.map(code => (
                  <Badge key={code} variant="outline" className="text-xs border-red-300 text-red-700 bg-white">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Migrated quizzes */}
          {category.migrated_quiz_codes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Đã migration ({category.migrated_quiz_codes.length} mã quiz):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.migrated_quiz_codes.map(code => (
                  <Badge key={code} variant="outline" className="text-xs border-green-300 text-green-700 bg-white">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
