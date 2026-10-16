'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Users, Star, Tag, Trash2, X } from 'lucide-react'
import type { Member } from '@/hooks/teacher/useTeacherClassroomDetail'

interface ClassroomMembersTabProps {
  members: Member[]
  classroomCode: string
  confirmRemoveStudentId: string | null
  onToggleStar: (studentId: string) => void
  onOpenTagModal: (member: Member) => void
  onSetConfirmRemoveStudentId: (studentId: string | null) => void
  onRemoveMember: (studentId: string) => void
}

export function ClassroomMembersTab({
  members,
  classroomCode,
  confirmRemoveStudentId,
  onToggleStar,
  onOpenTagModal,
  onSetConfirmRemoveStudentId,
  onRemoveMember,
}: ClassroomMembersTabProps) {
  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-card-foreground">
          Enrolled Students ({members.length})
        </h2>
      </div>

      {members.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-card-foreground">No students enrolled yet</h3>
          <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
            Share the Class Code <strong className="text-primary font-mono font-black">{classroomCode}</strong> with your students to join.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-border">
          {members.map((m) => (
            <div
              key={m._id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Star Button */}
                <button
                  type="button"
                  onClick={() => m.student?._id && onToggleStar(m.student._id)}
                  className="p-1 rounded-lg hover:bg-warning-bg text-muted-foreground hover:text-warning-fg transition-colors cursor-pointer"
                  title={m.is_starred ? 'Unstar student' : 'Star featured student'}
                >
                  <Star className={`w-5 h-5 ${m.is_starred ? 'fill-warning-fg text-warning-fg' : ''}`} />
                </button>

                {m.student?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.student.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center text-sm shadow-xs">
                    {m.student?.username?.[0]?.toUpperCase() || 'S'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-card-foreground text-sm">
                      {m.student?.username || 'Student'}
                    </span>
                    {m.is_starred && (
                      <span className="text-[10px] font-bold bg-warning-bg text-warning-fg px-2 py-0.5 rounded-full border border-warning-border flex items-center gap-1">
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.student?.email}</div>

                  {/* Student Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {m.tags && m.tags.length > 0
                      ? m.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md"
                          >
                            #{t}
                          </span>
                        ))
                      : null}
                    <button
                      type="button"
                      onClick={() => onOpenTagModal(m)}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      {m.tags && m.tags.length > 0 ? 'Edit tags' : '+ Add tag'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-xs font-medium text-muted-foreground">
                  Joined: {new Date(m.joined_at).toLocaleDateString('en-US')}
                </div>

                {confirmRemoveStudentId === m.student?._id ? (
                  <div className="flex items-center gap-1.5 bg-incorrect-bg p-1 rounded-xl border border-incorrect-border">
                    <span className="text-xs font-bold text-destructive px-1">Remove?</span>
                    <Button
                      onClick={() => m.student?._id && onRemoveMember(m.student._id)}
                      size="sm"
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs rounded-lg h-7 px-2.5 cursor-pointer"
                    >
                      Remove
                    </Button>
                    <button
                      onClick={() => onSetConfirmRemoveStudentId(null)}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => m.student?._id && onSetConfirmRemoveStudentId(m.student._id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-incorrect-bg transition-colors cursor-pointer"
                    title="Remove student from class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
