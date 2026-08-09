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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Quản lý Danh mục &amp; Chủ đề</h1>
          <p className="text-sm text-muted-foreground mt-1">Cấu hình danh mục môn thi và chủ đề học tập AI</p>
        </div>

        <div className="flex bg-muted p-1 rounded-2xl border border-border">
          <button
            onClick={() => setMainTab('ai_learning')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'ai_learning' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Học Tập AI
          </button>
          <button
            onClick={() => setMainTab('quiz_exam')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'quiz_exam' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Thi &amp; Quiz
          </button>
        </div>
      </div>

      {/* Main Tab 1: Quiz Exam Categories */}
      {mainTab === 'quiz_exam' && (
        <div className="space-y-6">
          <Card className="border-border bg-card text-card-foreground shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-black text-card-foreground">Danh mục Môn thi Public</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm danh mục..."
                  className="pl-10 h-9 rounded-xl border-border bg-card text-card-foreground text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên danh mục môn thi mới..."
                  className="h-10 text-xs font-semibold rounded-xl border-border bg-card text-card-foreground"
                />
                <Button
                  onClick={() => createMutation.mutate(newName.trim())}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl px-5 cursor-pointer"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thêm mới'}
                </Button>
              </div>

              {isCategoriesLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
                  {publicCategories.map((cat: Category) => (
                    <div key={cat._id} className="p-3.5 flex items-center justify-between bg-card text-xs font-bold text-card-foreground">
                      {editId === cat._id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs font-semibold rounded-lg bg-muted border-border text-card-foreground"
                          />
                          <Button size="sm" onClick={() => updateMutation.mutate({ id: cat._id, name: editName })} className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs">Lưu</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-8 text-xs">Hủy</Button>
                        </div>
                      ) : (
                        <>
                          <span>{cat.name} ({cat.quizCount} quiz)</span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(cat._id); setEditName(cat.name) }}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(cat)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
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
          <div className="flex gap-2 border-b border-border pb-3">
            <button
              onClick={() => setAiSubTab('topic')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                aiSubTab === 'topic' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              Chủ đề Học tập (Topics)
            </button>
            <button
              onClick={() => setAiSubTab('genre')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                aiSubTab === 'genre' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              Thể loại Văn bản (Genres)
            </button>
          </div>

          {aiSubTab === 'topic' ? (
            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardHeader><CardTitle className="text-lg font-black text-card-foreground">Quản lý Chủ đề AI Topics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Tên chủ đề mới..." className="h-10 text-xs font-semibold rounded-xl border-border bg-card text-card-foreground" />
                  <Button onClick={() => createTopicMutation.mutate({ name: topicName })} disabled={!topicName.trim() || createTopicMutation.isPending} className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl px-5 cursor-pointer">Thêm chủ đề</Button>
                </div>
                {isTopicsLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : (
                  <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
                    {topics.map((t: Topic) => (
                      <div key={t._id} className="p-3.5 flex items-center justify-between bg-card text-xs font-bold text-card-foreground">
                        <span>{t.name} ({t.slug})</span>
                        <Button size="sm" variant="ghost" onClick={() => deleteTopicMutation.mutate(t._id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card text-card-foreground shadow-xs">
              <CardHeader><CardTitle className="text-lg font-black text-card-foreground">Quản lý Thể loại Văn bản Genres</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={genreName} onChange={(e) => setGenreName(e.target.value)} placeholder="Tên thể loại mới..." className="h-10 text-xs font-semibold rounded-xl border-border bg-card text-card-foreground" />
                  <Button onClick={() => createGenreMutation.mutate({ name: genreName, description: genreDesc })} disabled={!genreName.trim() || createGenreMutation.isPending} className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl px-5 cursor-pointer">Thêm thể loại</Button>
                </div>
                {isGenresLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /> : (
                  <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
                    {genres.map((g: TextGenreItem) => (
                      <div key={g._id} className="p-3.5 flex items-center justify-between bg-card text-xs font-bold text-card-foreground">
                        <span>{g.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => deleteGenreMutation.mutate(g._id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-primary">Xác nhận xóa danh mục</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bạn có chắc chắn muốn xóa danh mục <span className="font-bold text-card-foreground">"{deleteTarget?.name}"</span>?
              {deleteTarget && (deleteTarget.quizCount > 0 || (deleteTarget.questionBankCount ?? 0) > 0) && (
                <span className="block text-destructive font-semibold mt-2">
                  ⚠️ Danh mục này hiện đang chứa {deleteTarget.quizCount} bài quiz và {deleteTarget.questionBankCount ?? 0} câu hỏi ngân hàng. Không thể xóa danh mục đang có dữ liệu liên kết.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="rounded-xl text-xs border-border">
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteTarget || deleteTarget.quizCount > 0 || (deleteTarget.questionBankCount ?? 0) > 0 || deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Xóa danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
