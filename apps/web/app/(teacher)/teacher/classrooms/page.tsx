'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { School, Plus, FileText } from 'lucide-react'
import { useTeacherClassrooms } from '@/hooks/useTeacherClassrooms'
import { ClassroomsGridList } from '@/components/teacher/classrooms/ClassroomsGridList'
import { TeacherClassroomModals } from '@/components/teacher/classrooms/TeacherClassroomModals'

export default function TeacherClassroomsPage() {
  const {
    classrooms,
    totalQuizzes,
    loading,
    createModalOpen,
    setCreateModalOpen,
    name,
    setName,
    description,
    setDescription,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    creating,
    errorMessage,
    handleCreateClassroom,
    passwordModalOpen,
    setPasswordModalOpen,
    selectedClassroomForPass,
    newPassword,
    setNewPassword,
    showNewPassword,
    setShowNewPassword,
    updatingPass,
    passMessage,
    handleOpenPasswordModal,
    handleUpdatePassword,
    shareModalOpen,
    setShareModalOpen,
    selectedClassroomForShare,
    shareCopied,
    handleOpenShareModal,
    handleCopyShareUrl,
    getShareUrl,
    confirmDeleteId,
    setConfirmDeleteId,
    copiedCode,
    handleCopyCode,
    handleDeleteClassroom,
    totalStudents,
  } = useTeacherClassrooms()

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Teacher Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-card-foreground flex items-center gap-3">
            <School className="w-8 h-8 text-primary" />
            Classroom Management &amp; Instruction
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Create and manage classrooms, issue join codes to students, and assign quizzes from the FQuiz bank.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/teacher/quizzes">
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all"
            >
              <FileText className="w-5 h-5" /> Quiz Management
            </Button>
          </Link>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Create New Classroom
          </Button>
        </div>
      </div>

      {/* Metrics & Classroom Grid */}
      <ClassroomsGridList
        classrooms={classrooms}
        totalStudents={totalStudents}
        totalQuizzes={totalQuizzes}
        loading={loading}
        copiedCode={copiedCode}
        onCopyCode={handleCopyCode}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenPasswordModal={handleOpenPasswordModal}
        onOpenShareModal={handleOpenShareModal}
        onConfirmDelete={setConfirmDeleteId}
      />

      {/* Modals for Create, Password, Share & Delete */}
      <TeacherClassroomModals
        createModalOpen={createModalOpen}
        onSetCreateModalOpen={setCreateModalOpen}
        name={name}
        onSetName={setName}
        description={description}
        onSetDescription={setDescription}
        password={password}
        onSetPassword={setPassword}
        showPassword={showPassword}
        onSetShowPassword={setShowPassword}
        creating={creating}
        errorMessage={errorMessage}
        onCreateClassroom={handleCreateClassroom}
        passwordModalOpen={passwordModalOpen}
        onSetPasswordModalOpen={setPasswordModalOpen}
        selectedClassroomForPass={selectedClassroomForPass}
        newPassword={newPassword}
        onSetNewPassword={setNewPassword}
        showNewPassword={showNewPassword}
        onSetShowNewPassword={setShowNewPassword}
        updatingPass={updatingPass}
        passMessage={passMessage}
        onUpdatePassword={handleUpdatePassword}
        shareModalOpen={shareModalOpen}
        onSetShareModalOpen={setShareModalOpen}
        selectedClassroomForShare={selectedClassroomForShare}
        shareCopied={shareCopied}
        onCopyShareUrl={handleCopyShareUrl}
        getShareUrl={getShareUrl}
        confirmDeleteId={confirmDeleteId}
        onSetConfirmDeleteId={setConfirmDeleteId}
        onDeleteClassroom={handleDeleteClassroom}
      />
    </div>
  )
}
