export interface Exercise {
  id: string
  userId: string
  name: string
  muscleGroup: string
  weightType: 'bodyweight' | 'assisted' | 'additional'
  technique: string
  sets: number
  reps: number
  exerciseType: 'main' | 'auxiliary' | 'isolation'
  equipmentName?: string
  equipmentSettings?: string
  equipmentPhoto?: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutSet {
  id: string
  setNumber: number
  reps: number
  weight: number
  completed: boolean
  restTime: number
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  exercise: Exercise
  sets: number | WorkoutSet[] // Может быть числом при создании или массивом при выполнении
  reps: number
  weight: number
  restTime: number
  completed: boolean
  weightTaken: boolean
  order: number
}

export interface Workout {
  id: string
  userId: string
  name: string
  exercises: WorkoutExercise[]
  startedAt: string
  completedAt?: string
  status: 'active' | 'completed'
}

export const MUSCLE_GROUPS = [
  'Грудь',
  'Спина',
  'Плечи',
  'Бицепс',
  'Трицепс',
  'Ноги',
  'Ягодицы',
  'Пресс',
  'Предплечья',
  'Икры'
] as const

export const EXERCISE_TYPES = [
  { value: 'main', label: 'Основное' },
  { value: 'auxiliary', label: 'Вспомогательное' },
  { value: 'isolation', label: 'Изолированное' }
] as const

export const WEIGHT_TYPES = [
  { value: 'bodyweight', label: 'Свой вес' },
  { value: 'assisted', label: 'Антивес' },
  { value: 'additional', label: 'Доп. вес' }
] as const