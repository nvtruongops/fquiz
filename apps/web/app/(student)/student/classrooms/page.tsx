'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Users, GraduationCap, Plus, CheckCircle2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStudentClassrooms } from '@/hooks/useStudentClassrooms'
import { ClassroomsSkeleton } from '@/components/student/classrooms/ClassroomsSkeleton'
import { ClassroomSidebarList } from '@/components/student/classrooms/ClassroomSidebarList'
import { ClassroomAssignmentsList } from '@/components/student/classrooms/ClassroomAssignmentsList'
import { StudentClassroomModals } from '@/components/student/classrooms/StudentClassroomModals'

export default function StudentClassroomsPage() {
  const {
    classrooms,
    selectedClassroom,
    setSelectedClassroom,
    assignments,
    loading,
    joinModalOpen,
    setJoinModalOpen,
    joinCode,
    setJoinCode,
    joinPassword,
    setJoinPassword,
    showJoinPassword,
    setShowJoinPassword,
    joining,
    errorMessage,
    successMessage,
    confirmLeaveId,
    setConfirmLeaveId,
    handleJoinClass,
    handleTogglePin,
    handleLeaveClass,
  } = useStudentClassrooms()

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-hidden px-4 sm:px-6 md:px-10 pt-4 pb-12">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-primary/5 to-transparent blur-3xl opacity-50 transform-gpu" />
      </div>

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-border shadow-xs"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Classrooms
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-primary" />
              My Classrooms
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl">
              Manage enrolled classrooms, track assignment deadlines, and practice materials directly from your instructors.
            </p>
          </div>

          <Button
            onClick={() => setJoinModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider gap-2 rounded-2xl h-12 px-6 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Join New Classroom
          </Button>
        </motion.div>

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-success-bg/20 text-success-fg rounded-2xl border border-success-fg/30 flex items-center gap-3 shadow-2xs text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-success-fg shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {loading ? (
          <ClassroomsSkeleton />
        ) : classrooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card backdrop-blur-md p-8 space-y-4 shadow-xs"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">You haven&apos;t joined any classrooms yet</h3>
              <p className="text-xs font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
                Enter the 6-character class code provided by your instructor to view assignments and class materials.
              </p>
            </div>
            <Button
              onClick={() => setJoinModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-2xl px-6 h-11 cursor-pointer shadow-sm"
            >
              Enter Class Code Now
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <ClassroomSidebarList
              classrooms={classrooms}
              selectedClassroom={selectedClassroom}
              onSelectClassroom={setSelectedClassroom}
              onTogglePin={handleTogglePin}
              onConfirmLeave={setConfirmLeaveId}
            />

            <ClassroomAssignmentsList
              assignments={assignments}
              selectedClassroom={selectedClassroom}
            />
          </div>
        )}
      </div>

      <StudentClassroomModals
        joinModalOpen={joinModalOpen}
        onSetJoinModalOpen={setJoinModalOpen}
        joinCode={joinCode}
        onSetJoinCode={setJoinCode}
        joinPassword={joinPassword}
        onSetJoinPassword={setJoinPassword}
        showJoinPassword={showJoinPassword}
        onSetShowJoinPassword={setShowJoinPassword}
        joining={joining}
        errorMessage={errorMessage}
        onJoinClass={handleJoinClass}
        confirmLeaveId={confirmLeaveId}
        onSetConfirmLeaveId={setConfirmLeaveId}
        onLeaveClass={handleLeaveClass}
      />
    </div>
  )
}
