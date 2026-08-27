import React from 'react'

interface UploadQuickJumpBarProps {
  conflictIndices: number[]
  newIndices: number[]
  reusedIndices: number[]
  onScrollToReviewQuestion: (qIndex: number) => void
}

export function UploadQuickJumpBar({
  conflictIndices,
  newIndices,
  reusedIndices,
  onScrollToReviewQuestion,
}: UploadQuickJumpBarProps) {
  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-border/60 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground">Truy cập nhanh câu hỏi theo loại:</span>
        <span className="text-[11px] text-muted-foreground">Bấm vào số câu để xem chi tiết bên dưới</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {conflictIndices.length > 0 && (
          <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/30 rounded-lg p-1.5 flex-wrap">
            <span className="font-bold text-destructive px-1">Mâu thuẫn:</span>
            {conflictIndices.map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onScrollToReviewQuestion(idx)}
                className="w-6 h-6 rounded-md bg-destructive text-destructive-foreground font-bold text-xs hover:opacity-80 transition-opacity flex items-center justify-center cursor-pointer"
                title={`Nhảy tới Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}

        {newIndices.length > 0 && (
          <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-lg p-1.5 flex-wrap">
            <span className="font-bold text-primary px-1">Mới ({newIndices.length}):</span>
            {newIndices.slice(0, 10).map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onScrollToReviewQuestion(idx)}
                className="w-6 h-6 rounded-md bg-primary text-primary-foreground font-bold text-xs hover:opacity-80 transition-opacity flex items-center justify-center cursor-pointer"
                title={`Nhảy tới Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
            {newIndices.length > 10 && (
              <span className="text-[10px] text-muted-foreground px-1">
                +{newIndices.length - 10} câu
              </span>
            )}
          </div>
        )}

        {reusedIndices.length > 0 && (
          <div className="flex items-center gap-1 bg-success-bg border border-success-border rounded-lg p-1.5 flex-wrap">
            <span className="font-bold text-success-fg px-1">Khớp ({reusedIndices.length}):</span>
            {reusedIndices.slice(0, 10).map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onScrollToReviewQuestion(idx)}
                className="w-6 h-6 rounded-md bg-success-fg text-success-text font-bold text-xs hover:opacity-80 transition-opacity flex items-center justify-center cursor-pointer"
                title={`Nhảy tới Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
            {reusedIndices.length > 10 && (
              <span className="text-[10px] text-muted-foreground px-1">
                +{reusedIndices.length - 10} câu
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
