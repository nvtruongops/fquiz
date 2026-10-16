'use client'

import React from 'react'
import { Card, CardTitle } from '@/components/shared/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu'
import { Users, Pin, PinOff, LogOut, MoreVertical } from 'lucide-react'
import type { Classroom } from '@/hooks/useStudentClassrooms'

interface ClassroomSidebarListProps {
  classrooms: Classroom[]
  selectedClassroom: Classroom | null
  onSelectClassroom: (classroom: Classroom) => void
  onTogglePin: (classroom: Classroom, e: React.MouseEvent) => void
  onConfirmLeave: (classroomId: string) => void
}

export function ClassroomSidebarList({
  classrooms,
  selectedClassroom,
  onSelectClassroom,
  onTogglePin,
  onConfirmLeave,
}: ClassroomSidebarListProps) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Enrolled Classrooms ({classrooms.length})
        </h2>
      </div>

      <div className="space-y-2.5">
        {classrooms.map((c: Classroom) => {
          const isSelected = selectedClassroom?._id === c._id
          return (
            <Card
              key={c._id}
              onClick={() => onSelectClassroom(c)}
              className={`cursor-pointer transition-all duration-300 border rounded-2xl overflow-hidden relative group p-4 ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c.is_pinned && <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />}
                      <CardTitle className="text-sm font-extrabold text-card-foreground truncate" title={c.name}>
                        {c.name}
                      </CardTitle>
                    </div>
                    <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                      Class Code: <span className="text-card-foreground font-mono">{c.code}</span>
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-1.5 border-border rounded-2xl shadow-xl z-50 bg-card">
                    <DropdownMenuItem
                      onClick={(e) => onTogglePin(c, e)}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold cursor-pointer text-card-foreground"
                    >
                      {c.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      <span className="text-xs">{c.is_pinned ? 'Unpin classroom' : 'Pin to top'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onConfirmLeave(c._id)}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-rose-600 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span className="text-xs">Leave classroom</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
