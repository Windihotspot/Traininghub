import ApiService from '@/services/api'
import { supabase } from '@/services/supabase'
import type { CModule, CLesson, CAssessment, CQuestion, LCourse, LLessonDetail, QuizStart, QuizResult, MyCourse } from '@/types/lms'

const kindOf = (f: File) =>
  f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : f.type === 'application/pdf' ? 'pdf' : 'document'

function probeDuration(f: File): Promise<number> {
  return new Promise((resolve) => {
    if (!/^(audio|video)\//.test(f.type)) return resolve(0)
    const el = document.createElement(f.type.startsWith('video') ? 'video' : 'audio')
    el.preload = 'metadata'
    el.src = URL.createObjectURL(f)
    el.onloadedmetadata = () => { resolve(Math.round(el.duration) || 0); URL.revokeObjectURL(el.src) }
    el.onerror = () => resolve(0)
  })
}

export const LmsService = {
  // ---- authoring
  curriculum: (trainingId: string) =>
    ApiService.post<{ modules: CModule[]; lessons: CLesson[]; assessments: CAssessment[] }>('/curriculum-get', { training_id: trainingId }),
  manage: (trainingId: string, entity: 'module' | 'lesson', op: 'create' | 'update' | 'delete' | 'reorder',
    extra: { id?: string; data?: object; order?: string[] } = {}) =>
    ApiService.post('/curriculum-manage', { training_id: trainingId, entity, op, ...extra }),
  saveAssessment: (trainingId: string, assessment: object, questions: CQuestion[]) =>
    ApiService.post<{ assessment_id: string }>('/assessment-save', { training_id: trainingId, assessment, questions }),

  async uploadMedia(organisationId: string, file: File) {
    const kind = kindOf(file)
    const duration = await probeDuration(file)
    const up = await ApiService.post<{ asset_id: string; path: string; upload: { token: string } }>('/media-create-upload', {
      organisation_id: organisationId, kind, filename: file.name, mime_type: file.type, size_bytes: file.size,
    })
    const { error } = await supabase.storage.from('course-media').uploadToSignedUrl(up.path, up.upload.token, file)
    if (error) throw error
    await ApiService.post('/media-confirm', { asset_id: up.asset_id, duration_seconds: duration })
    return { asset_id: up.asset_id, duration, kind }
  },
  addExternalMedia: (organisationId: string, kind: 'video' | 'audio', provider: string, url: string, duration = 0) =>
    ApiService.post<{ asset_id: string }>('/media-create-external', {
      organisation_id: organisationId, kind, provider, external_url: url, duration_seconds: duration,
    }),

  // ---- learner
  course: (trainingId: string) => ApiService.post<LCourse>('/learn-get-course', { training_id: trainingId }),
  lesson: (lessonId: string) => ApiService.post<LLessonDetail>('/learn-lesson', { lesson_id: lessonId }),
  progress: (lessonId: string, position: number, completed = false) =>
    ApiService.post<{ status: string; course_completed: boolean }>('/learn-progress', { lesson_id: lessonId, position_seconds: position, completed }),
  quizStart: (assessmentId: string) => ApiService.post<QuizStart>('/quiz-start', { assessment_id: assessmentId }),
  quizSubmit: (attemptId: string, answers: { question_id: string; option_ids: string[] }[]) =>
    ApiService.post<QuizResult>('/quiz-submit', { attempt_id: attemptId, answers }),
  myCourses: () => ApiService.post<{ courses: MyCourse[] }>('/learn-my-courses', {}),
}
