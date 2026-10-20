export type LessonType = 'video' | 'audio' | 'text' | 'pdf' | 'live_session'
export interface CModule { id: string; title: string; description: string | null; position: number; is_published: boolean; release_at: string | null }
export interface CLesson {
  id: string; module_id: string; title: string; description: string | null; lesson_type: LessonType; position: number
  media_asset_id: string | null; text_content: string | null; duration_seconds: number
  is_preview: boolean; is_required: boolean; is_published: boolean; release_at: string | null
  media?: { id: string; kind: string; status: string; provider: string; external_url: string | null } | null
}
export interface COption { id?: string; option_text: string; is_correct: boolean }
export interface CQuestion { id?: string; question_type: 'single_choice' | 'multiple_choice' | 'true_false'; prompt: string; explanation: string | null; points: number; options: COption[] }
export interface CAssessment {
  id: string; module_id: string | null; title: string; description?: string | null; assessment_type: 'quiz' | 'final_exam'
  pass_mark: number; max_attempts: number | null; time_limit_minutes: number | null
  shuffle_questions: boolean; show_answers: boolean; is_required: boolean; is_published: boolean; position: number
  questions: CQuestion[]
}
// learner side
export interface LLesson { id: string; module_id: string; title: string; lesson_type: LessonType; duration_seconds: number; is_preview: boolean; locked: string | null; progress: { status: 'in_progress' | 'completed'; last_position_seconds: number } | null }
export interface LAssessment { id: string; module_id: string | null; title: string; assessment_type: string; pass_mark: number; max_attempts: number | null; time_limit_minutes: number | null }
export interface LCourse {
  training: { id: string; title: string; sequential: boolean; certificate_enabled: boolean }
  enrollment: { id: string; status: string; progress_percent: number; expires_at: string | null }
  modules: (CModule & { lessons: LLesson[]; assessments: LAssessment[] })[]
  final_assessments: LAssessment[]
  attempts: { assessment_id: string; status: string; percentage: number | null; passed: boolean | null }[]
}
export interface Playback { type: string; url?: string; provider?: string; external_id?: string; mime_type?: string; captions?: { lang: string; label: string; url: string }[] }
export interface LLessonDetail {
  lesson: { id: string; title: string; description: string | null; lesson_type: LessonType; text_content: string | null; duration_seconds: number }
  playback: Playback | null; transcript: string | null; resources: { id: string; title: string }[]; resume_seconds: number
}
export interface QuizQuestion { id: string; question_type: string; prompt: string; points: number; options: { id: string; option_text: string }[] }
export interface QuizStart { attempt_id: string; attempt_no: number; started_at: string; time_limit_minutes: number | null; pass_mark: number; questions: QuizQuestion[] }
export interface QuizResult { score: number; max_score: number; percentage: number; passed: boolean; course_completed: boolean; review: { question_id: string; is_correct: boolean; correct_option_ids?: string[]; explanation?: string | null }[] }
export interface MyCourse { enrollment_id: string; training_id: string; status: string; progress_percent: number; title: string; cover_image: string | null }
