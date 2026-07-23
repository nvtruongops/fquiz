'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/shared/ui/dialog'
import { Pencil, Trash2, Search, Loader2 } from 'lucide-react'

import { useAdminCategories, Category, Topic, TextGenreItem } from '@/hooks/useAdminCategories'

export default function AdminCategoriesPage() {
  const {
    mainTab, setMainTab,
    aiSubTab, setAiSubTab,
    newName, setNewName,
    editId, setEditId,
    editName, setEditName,
    deleteTarget, setDeleteTarget,
    search, setSearch,
    topicName, setTopicName,
    topicSlug, setTopicSlug,
    editTopicId, setEditTopicId,
    editTopicName, setEditTopicName,
    editTopicSlug, setEditTopicSlug,
    deleteTopicTarget, setDeleteTopicTarget,
    genreName, setGenreName,
    genreDesc, setGenreDesc,
    deleteGenreTarget, setDeleteGenreTarget,
    isCategoriesLoading, publicCategories,
    isTopicsLoading, topics,
    isGenresLoading, genres,
    createMutation, updateMutation, deleteMutation,
    createTopicMutation, updateTopicMutation, deleteTopicMutation,
    createGenreMutation, deleteGenreMutation,
  } = useAdminCategories()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header & Main Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#5D7B6F]">Quản lý Danh mục & Chủ đề</h1>
          <p className="text-sm text-slate-500 mt-1">Cấu hình danh mục môn thi và chủ đề học tập AI</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setMainTab('ai_learning')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'ai_learning' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            Học Tập AI
          </button>
          <button
            onClick={() => setMainTab('quiz_exam')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'quiz_exam' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            Thi & Quiz
          </button>
        </div>
      </div>

      {/* Main Tab 1: Quiz Exam Categories */}
      {mainTab === 'quiz_exam' && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-black text-slate-800">Danh mục Môn thi Public</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm danh mục..."
                  className="pl-10 h-9 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên danh mục môn thi mới..."
                  className="h-10 text-xs font-semibold rounded-xl border-slate-200"
                />
                <Button
                  onClick={() => createMutation.mutate(newName.trim())}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="h-10 bg-[#5D7B6F] text-white text-xs font-bold rounded-xl px-5"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thêm mới'}
                </Button>
              </div>

              {isCategoriesLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#5D7B6F] mx-auto" /></div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {publicCategories.map((cat: Category) => (
                    <div key={cat._id} className="p-3.5 flex items-center justify-between bg-white text-xs font-bold text-slate-800">
                      {editId === cat._id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs font-semibold rounded-lg bg-slate-50"
                          />
                          <Button size="sm" onClick={() => updateMutation.mutate({ id: cat._id, name: editName })} className="h-8 bg-[#5D7B6F] text-white text-xs">Lưu</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-8 text-xs">Hủy</Button>
                        </div>
                      ) : (
                        <>
                          <span>{cat.name} ({cat.quizCount} quiz)</span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(cat._id); setEditName(cat.name) }}><Pencil className="w-3.5 h-3.5 text-slate-500" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(cat)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tab 2: AI Learning Topics & Genres */}
      {mainTab === 'ai_learning' && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setAiSubTab('topic')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                aiSubTab === 'topic' ? 'bg-[#5D7B6F] text-white border-[#5D7B6F]' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Chủ đề Học tập (Topics)
            </button>
            <button
              onClick={() => setAiSubTab('genre')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                aiSubTab === 'genre' ? 'bg-[#5D7B6F] text-white border-[#5D7B6F]' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Thể loại Văn bản (Genres)
            </button>
          </div>

          {aiSubTab === 'topic' ? (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader><CardTitle className="text-lg font-black text-slate-800">Quản lý Chủ đề AI Topics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Tên chủ đề mới..." className="h-10 text-xs font-semibold rounded-xl" />
                  <Button onClick={() => createTopicMutation.mutate({ name: topicName })} disabled={!topicName.trim() || createTopicMutation.isPending} className="h-10 bg-[#5D7B6F] text-white text-xs font-bold rounded-xl px-5">Thêm chủ đề</Button>
                </div>
                {isTopicsLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#5D7B6F] mx-auto" /> : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    {topics.map((t: Topic) => (
                      <div key={t._id} className="p-3.5 flex items-center justify-between bg-white text-xs font-bold text-slate-800">
                        <span>{t.name} ({t.slug})</span>
                        <Button size="sm" variant="ghost" onClick={() => deleteTopicMutation.mutate(t._id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader><CardTitle className="text-lg font-black text-slate-800">Quản lý Thể loại Văn bản Genres</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={genreName} onChange={(e) => setGenreName(e.target.value)} placeholder="Tên thể loại mới..." className="h-10 text-xs font-semibold rounded-xl" />
                  <Button onClick={() => createGenreMutation.mutate({ name: genreName, description: genreDesc })} disabled={!genreName.trim() || createGenreMutation.isPending} className="h-10 bg-[#5D7B6F] text-white text-xs font-bold rounded-xl px-5">Thêm thể loại</Button>
                </div>
                {isGenresLoading ? <Loader2 className="w-6 h-6 animate-spin text-[#5D7B6F] mx-auto" /> : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    {genres.map((g: TextGenreItem) => (
                      <div key={g._id} className="p-3.5 flex items-center justify-between bg-white text-xs font-bold text-slate-800">
                        <span>{g.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => deleteGenreMutation.mutate(g._id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
