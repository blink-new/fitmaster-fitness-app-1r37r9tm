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

export interface Workout {
  id: string
  userId: string
  name: string
  createdAt: string
  completedAt?: string
  isActive: boolean
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  orderIndex: number
  currentWeight?: number
  weightAchieved: boolean
  createdAt: string
  exercise?: Exercise
}

export interface WorkoutSet {
  id: string
  workoutExerciseId: string
  setNumber: number
  weight?: number
  reps?: number
  completed: boolean
  createdAt: string
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