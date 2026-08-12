import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'

// Dictonary fallback cho các từ vựng tiếng Anh thông dụng trong Quiz bài tập
const FALLBACK_DICTIONARY: Record<string, { translation: string; ipa?: string; partOfSpeech?: string }> = {
  accountable: {
    translation: 'Chịu trách nhiệm giải trình, có trách nhiệm với kết quả công việc.',
    ipa: '/əˈkaʊn.tə.bəl/',
    partOfSpeech: 'adjective',
  },
  responsibility: {
    translation: 'Trách nhiệm, bổn phận, nghĩa vụ được giao trong công việc hoặc cuộc sống.',
    ipa: '/rɪˌspɒn.səˈbɪl.ə.ti/',
    partOfSpeech: 'noun',
  },
  matrix: {
    translation: 'Ma trận, bảng tổng hợp phân công trách nhiệm (RAM / RACI).',
    ipa: '/ˈmeɪ.trɪks/',
    partOfSpeech: 'noun',
  },
  statement: {
    translation: 'Phát biểu, câu khẳng định, mệnh đề.',
    ipa: '/ˈsteɪt.mənt/',
    partOfSpeech: 'noun',
  },
  correct: {
    translation: 'Chính xác, đúng đắn, phù hợp.',
    ipa: '/kəˈrekt/',
    partOfSpeech: 'adjective',
  },
  discussing: {
    translation: 'Thảo luận, bàn luận, trao đổi ý kiến.',
    ipa: '/dɪˈskʌs.ɪŋ/',
    partOfSpeech: 'verb',
  },
  member: {
    translation: 'Thành viên, người trong nhóm hoặc tổ chức.',
    ipa: '/ˈmem.bər/',
    partOfSpeech: 'noun',
  },
  task: {
    translation: 'Nhiệm vụ, công việc được giao.',
    ipa: '/tɑːsk/',
    partOfSpeech: 'noun',
  },
}

/**
 * GET /api/v1/learning/vocabulary/lookup?q=expression
 * Tra cứu nhanh nghĩa từ vựng từ Global Lexicon hoặc Dictionary Fallback
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    if (!q) {
      return NextResponse.json({ error: 'Từ cần tra không được để trống' }, { status: 400 })
    }

    await connectDB()

    const normalizedExpr = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // 1. Tìm trong DB Vocabulary (Global Lexicon)
    const vocab = await Vocabulary.findOne({
      $or: [{ normalizedLemma: normalizedExpr }, { lemma: new RegExp(`^${normalizedExpr}$`, 'i') }],
    }).lean()

    if (vocab) {
      return NextResponse.json({
        success: true,
        item: {
          expression: q,
          display: vocab.display || vocab.lemma,
          translation: vocab.definition,
          ipa: vocab.ipa || null,
          partOfSpeech: vocab.partOfSpeech || null,
        },
      })
    }

    // 2. Tra trong Fallback Dictionary
    const dictMatch = FALLBACK_DICTIONARY[normalizedExpr]
    if (dictMatch) {
      return NextResponse.json({
        success: true,
        item: {
          expression: q,
          display: q,
          translation: dictMatch.translation,
          ipa: dictMatch.ipa || null,
          partOfSpeech: dictMatch.partOfSpeech || null,
        },
      })
    }

    // 3. Nếu chưa có trong DB, trả về thông tin tra từ mặc định
    return NextResponse.json({
      success: true,
      item: {
        expression: q,
        display: q,
        translation: `Định nghĩa từ vựng "${q}". (Bấm "Lưu từ" để lưu vào Sổ từ vựng FSRS)`,
        ipa: null,
        partOfSpeech: q.includes(' ') ? 'phrase' : 'word',
      },
    })
  } catch (err: any) {
    console.error('[API /api/v1/learning/vocabulary/lookup] Error:', err)
    return NextResponse.json({ error: 'Lỗi tra cứu từ vựng' }, { status: 500 })
  }
}
