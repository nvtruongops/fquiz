'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Zap,
  TrendingUp,
  Coins,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Languages,
  PenTool,
  Brain,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Badge } from '@/components/shared/ui/badge'

interface TabStat {
  id: string
  label: string
  color: string
  types: string[]
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgInputTokens: number
  avgOutputTokens: number
  avgTotalTokens: number
  totalCost: number
}

interface LogItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: string
  tabId: string
  tabLabel: string
  language: string
  topic?: string
  aiProvider: string
  aiModel: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  durationMs: number
  createdAt: string
}

interface SummaryData {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgTokensPerCall: number
  totalCost: number
}

const TAB_ICONS: Record<string, any> = {
  vocabulary: BookOpen,
  grammar: Brain,
  reading: FileText,
  translation: Languages,
  writing: PenTool,
}

const TAB_SHORT_LABELS: Record<string, string> = {
  vocabulary: 'Tra từ vựng',
  grammar: 'Phân tích ngữ pháp',
  reading: 'Đọc hiểu',
  translation: 'Dịch thuật',
  writing: 'Luyện viết',
}

const TAB_COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' },
  blue: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' },
  violet: { bg: 'bg-violet-50 text-violet-700', text: 'text-violet-700', border: 'border-violet-200' },
  amber: { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-200' },
  rose: { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200' },
}

export default function AdminAIUsagePage() {
  const [range, setRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [selectedTabFilter, setSelectedTabFilter] = useState<string>('')
  const [searchUser, setSearchUser] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [summary, setSummary] = useState<SummaryData>({
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    avgTokensPerCall: 0,
    totalCost: 0,
  })

  const [tabStats, setTabStats] = useState<TabStat[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [totalPages, setTotalPages] = useState<number>(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        range,
        page: String(page),
        limit: '15',
        ...(selectedTabFilter ? { tab: selectedTabFilter } : {}),
      })

      const res = await fetch(`/api/admin/ai-usage?${queryParams.toString()}`)
      if (!res.ok) {
        throw new Error('Không thể tải dữ liệu thống kê từ server')
      }

      const data = await res.json()
      setSummary(data.summary || {})
      setTabStats(data.tabStats || [])
      setLogs(data.logs || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }, [range, page, selectedTabFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredLogs = logs.filter((log) => {
    if (!searchUser.trim()) return true
    const term = searchUser.toLowerCase()
    return (
      log.userName.toLowerCase().includes(term) ||
      log.userEmail.toLowerCase().includes(term) ||
      log.topic?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5D7B6F] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#5D7B6F] tracking-tight">Quản lý AI Usage Token</h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Thống kê lưu lượng token, số phiên và chi phí sử dụng AI theo 5 tab học tập
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Filter & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-white border border-[#A4C3A2]/50 p-1 rounded-xl flex items-center shadow-2xs text-xs font-semibold text-gray-600">
            {(
              [
                { id: '24h', label: '24 Giờ' },
                { id: '7d', label: '7 Ngày' },
                { id: '30d', label: '30 Ngày' },
                { id: 'all', label: 'Tất cả' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setRange(item.id)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === item.id
                    ? 'bg-[#5D7B6F] text-white font-bold shadow-2xs'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={loading}
            className="h-9 w-9 rounded-xl border-[#A4C3A2]/50 text-[#5D7B6F] hover:bg-[#EAE7D6]"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchData} className="text-red-700 underline text-xs">
            Thử lại
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Calls */}
        <Card className="bg-white border-[#A4C3A2]/50 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {loading ? '...' : summary.totalCalls.toLocaleString('vi-VN')}
              </p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">Tổng số phiên gọi AI</p>
            </div>
          </CardContent>
        </Card>

        {/* Input Tokens */}
        <Card className="bg-white border-[#A4C3A2]/50 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {loading ? '...' : summary.totalInputTokens.toLocaleString('vi-VN')}
              </p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">Input Tokens (Prompt)</p>
            </div>
          </CardContent>
        </Card>

        {/* Output Tokens */}
        <Card className="bg-white border-[#A4C3A2]/50 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {loading ? '...' : summary.totalOutputTokens.toLocaleString('vi-VN')}
              </p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">Output Tokens (Gen)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Breakdown Table (Thống kê theo 5 Tab học tập) */}
      <Card className="bg-white border-[#A4C3A2]/50 shadow-2xs overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-gray-100 py-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#5D7B6F]">
                Thống kê Token theo 5 Tab Học tập AI
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                Tính tổng số phiên và số token trung bình (Input, Output, Total) cho từng tính năng
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tab Tính Năng</th>
                <th className="py-3 px-3 text-right">Tổng Số Phiên</th>
                <th className="py-3 px-3 text-right">Tổng Input Tokens</th>
                <th className="py-3 px-3 text-right">Tổng Output Tokens</th>
                <th className="py-3 px-3 text-right bg-emerald-50/40 text-emerald-800">TB Input / Phiên</th>
                <th className="py-3 px-3 text-right bg-violet-50/40 text-violet-800">TB Output / Phiên</th>
                <th className="py-3 px-3 text-right bg-amber-50/40 text-amber-900">TB Tổng Token / Phiên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Đang tải dữ liệu thống kê tính năng...
                  </td>
                </tr>
              ) : tabStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Chưa có dữ liệu phiên gọi AI trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                tabStats.map((tab) => {
                  const Icon = TAB_ICONS[tab.id] || Sparkles
                  const style = TAB_COLOR_CLASSES[tab.color] || TAB_COLOR_CLASSES.emerald

                  return (
                    <tr key={tab.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Feature Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{tab.label}</span>
                            <span className="text-[10px] text-gray-400 font-mono">type: {tab.types.join(', ')}</span>
                          </div>
                        </div>
                      </td>

                      {/* Total Calls */}
                      <td className="py-3.5 px-3 text-right font-bold text-gray-900">
                        {tab.totalCalls.toLocaleString('vi-VN')}
                      </td>

                      {/* Total Input Tokens */}
                      <td className="py-3.5 px-3 text-right text-gray-600">
                        {tab.totalInputTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Total Output Tokens */}
                      <td className="py-3.5 px-3 text-right text-gray-600">
                        {tab.totalOutputTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Avg Input per Call */}
                      <td className="py-3.5 px-3 text-right font-bold bg-emerald-50/20 text-emerald-700">
                        {tab.avgInputTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Avg Output per Call */}
                      <td className="py-3.5 px-3 text-right font-bold bg-violet-50/20 text-violet-700">
                        {tab.avgOutputTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Avg Total Tokens per Call */}
                      <td className="py-3.5 px-3 text-right font-bold bg-amber-50/20 text-amber-800">
                        {tab.avgTotalTokens.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detailed Call Logs Table */}
      <Card className="bg-white border-[#A4C3A2]/50 shadow-2xs">
        <CardHeader className="border-b border-gray-100 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-[#5D7B6F]">Nhật ký các phiên gọi AI gần đây</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Danh sách chi tiết từng yêu cầu phát sinh token của người dùng
            </CardDescription>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Tìm tên, email..."
                className="pl-8 h-8 rounded-xl text-xs border-gray-200 focus:border-[#5D7B6F]"
              />
            </div>

            {/* Tab Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => {
                  setSelectedTabFilter('')
                  setPage(1)
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedTabFilter === '' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tất cả tab
              </button>
              {tabStats.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTabFilter(t.id)
                    setPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    selectedTabFilter === t.id ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {TAB_SHORT_LABELS[t.id] || t.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Học viên</th>
                <th className="py-3 px-3">Tính Năng</th>
                <th className="py-3 px-3">AI Model</th>
                <th className="py-3 px-3 text-right">Input</th>
                <th className="py-3 px-3 text-right">Output</th>
                <th className="py-3 px-3 text-right">Tổng Token</th>
                <th className="py-3 px-4 text-right">Thời gian xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    Đang tải danh sách nhật ký...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    Không tìm thấy nhật ký cuộc gọi AI nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const matchedTab = tabStats.find((t) => t.id === log.tabId)
                  const style = matchedTab ? TAB_COLOR_CLASSES[matchedTab.color] : TAB_COLOR_CLASSES.emerald

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Time */}
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-gray-900">{log.userName}</p>
                          <p className="text-[10px] text-gray-400">{log.userEmail}</p>
                        </div>
                      </td>

                      {/* Feature Tab Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge className={`${style?.bg} ${style?.border} border shadow-2xs font-semibold px-2 py-0.5`}>
                          {log.tabLabel}
                        </Badge>
                      </td>

                      {/* Model */}
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                        {log.aiModel}
                      </td>

                      {/* Input Tokens */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                        {log.inputTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Output Tokens */}
                      <td className="py-3 px-3 text-right font-mono text-violet-700 font-bold">
                        {log.outputTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Total Tokens */}
                      <td className="py-3 px-3 text-right font-mono text-gray-900 font-bold">
                        {log.totalTokens.toLocaleString('vi-VN')}
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 text-right text-gray-500 font-mono">
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(2)}s` : 'N/A'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-gray-500">
            Trang <span className="font-bold text-gray-900">{page}</span> /{' '}
            <span className="font-bold text-gray-900">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 text-xs border-gray-200 text-gray-600 rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 text-xs border-gray-200 text-gray-600 rounded-xl"
            >
              Trang sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
