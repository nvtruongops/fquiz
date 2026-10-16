'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs'
import { BookOpen, Users } from 'lucide-react'
import { useTeacherClassroomDetail } from '@/hooks/teacher/useTeacherClassroomDetail'
import { ClassroomDetailHeader } from '@/components/teacher/classroom/ClassroomDetailHeader'
import { ClassroomAssignmentsTab } from '@/components/teacher/classroom/ClassroomAssignmentsTab'
import { ClassroomMembersTab } from '@/components/teacher/classroom/ClassroomMembersTab'
import { ClassroomModals } from '@/components/teacher/classroom/ClassroomModals'

export default function TeacherClassroomDetailPage() {
  const params = useParams()
  const classroomId = params.id as string

  const {
    classroom,
    members,
    assignments,
    loading,
    copied,
    handleCopyCode,
    assignModalOpen,
    setAssignModalOpen,
    myQuizzes,
    selectedQuizId,
    setSelectedQuizId,
    assignmentTitle,
    setAssignmentTitle,
    dueAt,
    setDueAt,
    assigning,
    errorMessage,
    handleAssignQuiz,
    reportModalOpen,
    setReportModalOpen,
    selectedAssignmentReport,
    loadingReport,
    handleViewReport,
    handleToggleStar,
    tagModalOpen,
    setTagModalOpen,
    selectedMemberForTag,
    tagInputText,
    setTagInputText,
    updatingTags,
    handleOpenTagModal,
    handleSaveTags,
    confirmRemoveStudentId,
    setConfirmRemoveStudentId,
    handleRemoveMember,
  } = useTeacherClassroomDetail(classroomId)

  if (loading) {
    return (
      <div className="py-16 text-center text-muted-foreground font-semibold">
        Loading classroom details...
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="py-16 text-center text-destructive font-semibold">
        Classroom not found.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Info & Invite Code */}
      <ClassroomDetailHeader classroom={classroom} copied={copied} onCopyCode={handleCopyCode} />

      {/* Tabs System */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-card border border-border p-1 text-muted-foreground gap-1">
          <TabsTrigger
            value="assignments"
            className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" /> Assignments & Quizzes ({assignments.length})
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" /> Students ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <ClassroomAssignmentsTab
            assignments={assignments}
            onOpenAssignModal={() => setAssignModalOpen(true)}
            onViewReport={handleViewReport}
          />
        </TabsContent>

        <TabsContent value="members">
          <ClassroomMembersTab
            members={members}
            classroomCode={classroom.code}
            confirmRemoveStudentId={confirmRemoveStudentId}
            onToggleStar={handleToggleStar}
            onOpenTagModal={handleOpenTagModal}
            onSetConfirmRemoveStudentId={setConfirmRemoveStudentId}
            onRemoveMember={handleRemoveMember}
          />
        </TabsContent>
      </Tabs>

      {/* Modals for Assign Quiz, Grade Report & Student Tags */}
      <ClassroomModals
        assignModalOpen={assignModalOpen}
        onSetAssignModalOpen={setAssignModalOpen}
        myQuizzes={myQuizzes}
        selectedQuizId={selectedQuizId}
        onSetSelectedQuizId={setSelectedQuizId}
        assignmentTitle={assignmentTitle}
        onSetAssignmentTitle={setAssignmentTitle}
        dueAt={dueAt}
        onSetDueAt={setDueAt}
        assigning={assigning}
        errorMessage={errorMessage}
        onAssignQuiz={handleAssignQuiz}
        reportModalOpen={reportModalOpen}
        onSetReportModalOpen={setReportModalOpen}
        selectedAssignmentReport={selectedAssignmentReport}
        loadingReport={loadingReport}
        tagModalOpen={tagModalOpen}
        onSetTagModalOpen={setTagModalOpen}
        selectedMemberForTag={selectedMemberForTag}
        tagInputText={tagInputText}
        onSetTagInputText={setTagInputText}
        updatingTags={updatingTags}
        onSaveTags={handleSaveTags}
      />
    </div>
  )
}
