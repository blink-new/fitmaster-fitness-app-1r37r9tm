import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  Calendar, 
  Dumbbell, 
  Target, 
  Award,
  BarChart3,
  Clock,
  CheckCircle
} from 'lucide-react'
import { blink } from '@/blink/client'
import type { Workout, Exercise } from '@/types'
import { MUSCLE_GROUPS } from '@/types'

interface ExerciseProgress {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  sessions: {
    date: string
    maxWeight: number
    totalVolume: number
    setsCompleted: number
    weightTaken: boolean
  }[]
  bestWeight: number
  totalVolume: number
  sessionsCount: number
  lastPerformed: string
}

export function ProgressPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([])
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const analyzeProgress = useCallback((workoutsData: Workout[], exercisesData: Exercise[]) => {
    const progressMap = new Map<string, ExerciseProgress>()

    // Фильтруем тренировки по периоду
    const periodDays = parseInt(selectedPeriod)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - periodDays)

    const filteredWorkouts = workoutsData.filter(workout => 
      new Date(workout.startedAt) >= cutoffDate
    )

    filteredWorkouts.forEach(workout => {
      workout.exercises.forEach(workoutExercise => {
        const exerciseId = workoutExercise.exerciseId
        const exercise = exercisesData.find(ex => ex.id === exerciseId)
        
        if (!exercise) return

        if (!progressMap.has(exerciseId)) {
          progressMap.set(exerciseId, {
            exerciseId,
            exerciseName: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sessions: [],
            bestWeight: 0,
            totalVolume: 0,
            sessionsCount: 0,
            lastPerformed: ''
          })
        }

        const progress = progressMap.get(exerciseId)!
        
        // Анализируем подходы
        const sets = Array.isArray(workoutExercise.sets) ? workoutExercise.sets : []
        const completedSets = sets.filter(set => set.completed)
        const maxWeight = sets.length > 0 ? Math.max(...sets.map(set => set.weight), 0) : 0
        const totalVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0)

        progress.sessions.push({
          date: workout.startedAt,
          maxWeight,
          totalVolume,
          setsCompleted: completedSets.length,
          weightTaken: workoutExercise.weightTaken || false
        })

        progress.bestWeight = Math.max(progress.bestWeight, maxWeight)
        progress.totalVolume += totalVolume
        progress.sessionsCount++
        progress.lastPerformed = workout.startedAt
      })
    })

    // Сортируем сессии по дате
    progressMap.forEach(progress => {
      progress.sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })

    setExerciseProgress(Array.from(progressMap.values()))
  }, [selectedPeriod])

  const loadData = useCallback(async () => {
    if (!user?.id) return
    
    try {
      // Загружаем тренировки
      const workoutsData = await blink.db.workouts.list({
        where: { userId: user.id },
        orderBy: { startedAt: 'desc' }
      })
      
      // Парсим упражнения из JSON строк
      const parsedWorkouts = workoutsData.map(workout => ({
        ...workout,
        exercises: JSON.parse(workout.exercises || '[]')
      }))
      
      setWorkouts(parsedWorkouts)

      // Загружаем упражнения
      const exercisesData = await blink.db.exercises.list({
        where: { userId: user.id }
      })
      setExercises(exercisesData)

      // Анализируем прогресс
      analyzeProgress(parsedWorkouts, exercisesData)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    }
  }, [user?.id, analyzeProgress])

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id, loadData])

  // Пересчитываем прогресс при изменении периода
  useEffect(() => {
    if (workouts.length > 0 && exercises.length > 0) {
      analyzeProgress(workouts, exercises)
    }
  }, [selectedPeriod, workouts, exercises, analyzeProgress])

  const getFilteredProgress = () => {
    if (selectedMuscleGroup === 'all') {
      return exerciseProgress
    }
    return exerciseProgress.filter(progress => progress.muscleGroup === selectedMuscleGroup)
  }

  const getWorkoutStats = () => {
    const periodDays = parseInt(selectedPeriod)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - periodDays)

    const filteredWorkouts = workouts.filter(workout => 
      new Date(workout.startedAt) >= cutoffDate
    )

    const completedWorkouts = filteredWorkouts.filter(w => w.status === 'completed')
    const totalExercises = filteredWorkouts.reduce((sum, w) => sum + w.exercises.length, 0)
    const totalSets = filteredWorkouts.reduce((sum, w) => 
      sum + w.exercises.reduce((exSum, ex) => {
        const setsCount = Array.isArray(ex.sets) ? ex.sets.length : (typeof ex.sets === 'number' ? ex.sets : 0)
        return exSum + setsCount
      }, 0), 0
    )

    return {
      totalWorkouts: completedWorkouts.length,
      totalExercises,
      totalSets,
      avgWorkoutsPerWeek: Math.round((completedWorkouts.length / periodDays) * 7 * 10) / 10
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const getProgressTrend = (sessions: ExerciseProgress['sessions']) => {
    if (sessions.length < 2) return 'stable'
    
    const recent = sessions.slice(-3)
    const older = sessions.slice(-6, -3)
    
    if (recent.length === 0 || older.length === 0) return 'stable'
    
    const recentAvg = recent.reduce((sum, s) => sum + s.maxWeight, 0) / recent.length
    const olderAvg = older.reduce((sum, s) => sum + s.maxWeight, 0) / older.length
    
    if (recentAvg > olderAvg * 1.05) return 'up'
    if (recentAvg < olderAvg * 0.95) return 'down'
    return 'stable'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Войдите, чтобы просматривать прогресс</p>
        </div>
      </div>
    )
  }

  const stats = getWorkoutStats()
  const filteredProgress = getFilteredProgress()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Прогресс тренировок</h1>
          <p className="text-gray-600">Отслеживайте свои достижения и рост</p>
        </div>

        {/* Фильтры */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Период</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 дней</SelectItem>
                    <SelectItem value="30">30 дней</SelectItem>
                    <SelectItem value="90">3 месяца</SelectItem>
                    <SelectItem value="365">Год</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Группа мышц</label>
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все группы</SelectItem>
                    {MUSCLE_GROUPS.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="exercises">По упражнениям</TabsTrigger>
            <TabsTrigger value="workouts">История тренировок</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Тренировок</p>
                      <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Dumbbell className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Упражнений</p>
                      <p className="text-2xl font-bold">{stats.totalExercises}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Подходов</p>
                      <p className="text-2xl font-bold">{stats.totalSets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">В неделю</p>
                      <p className="text-2xl font-bold">{stats.avgWorkoutsPerWeek}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Топ упражнения по прогрессу */}
            <Card>
              <CardHeader>
                <CardTitle>Лучший прогресс</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredProgress
                    .filter(p => p.sessionsCount >= 2)
                    .sort((a, b) => {
                      const trendA = getProgressTrend(a.sessions)
                      const trendB = getProgressTrend(b.sessions)
                      if (trendA === 'up' && trendB !== 'up') return -1
                      if (trendB === 'up' && trendA !== 'up') return 1
                      return b.bestWeight - a.bestWeight
                    })
                    .slice(0, 5)
                    .map(progress => {
                      const trend = getProgressTrend(progress.sessions)
                      return (
                        <div key={progress.exerciseId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              trend === 'up' ? 'bg-green-100' : 
                              trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <TrendingUp className={`h-4 w-4 ${
                                trend === 'up' ? 'text-green-600' : 
                                trend === 'down' ? 'text-red-600 rotate-180' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{progress.exerciseName}</p>
                              <p className="text-sm text-gray-600">{progress.muscleGroup}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{progress.bestWeight} кг</p>
                            <p className="text-sm text-gray-600">{progress.sessionsCount} сессий</p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredProgress.map(progress => (
                <Card key={progress.exerciseId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{progress.exerciseName}</CardTitle>
                        <p className="text-sm text-gray-600">{progress.muscleGroup}</p>
                      </div>
                      <Badge variant="outline">
                        {progress.sessionsCount} сессий
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-600 font-medium">Лучший вес</p>
                          <p className="text-xl font-bold text-blue-800">{progress.bestWeight} кг</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm text-green-600 font-medium">Общий объем</p>
                          <p className="text-xl font-bold text-green-800">{Math.round(progress.totalVolume)} кг</p>
                        </div>
                      </div>
                      
                      {progress.sessions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Последние сессии:</p>
                          <div className="space-y-1">
                            {progress.sessions.slice(-3).reverse().map((session, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{formatDate(session.date)}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{session.maxWeight} кг</span>
                                  {session.weightTaken ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workouts" className="space-y-6">
            <div className="space-y-4">
              {workouts
                .filter(workout => {
                  const periodDays = parseInt(selectedPeriod)
                  const cutoffDate = new Date()
                  cutoffDate.setDate(cutoffDate.getDate() - periodDays)
                  return new Date(workout.startedAt) >= cutoffDate
                })
                .map(workout => (
                  <Card key={workout.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{workout.name}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {new Date(workout.startedAt).toLocaleDateString('ru-RU', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={workout.status === 'completed' ? 'default' : 'secondary'}>
                            {workout.status === 'completed' ? 'Завершена' : 'Активна'}
                          </Badge>
                          {workout.completedAt && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-1" />
                              {Math.round((new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()) / (1000 * 60))} мин
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workout.exercises.map((exercise, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <p className="font-medium text-sm">{exercise.exercise.name}</p>
                            <p className="text-xs text-gray-600 mb-2">{exercise.exercise.muscleGroup}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">
                                {Array.isArray(exercise.sets) 
                                  ? `${exercise.sets.filter(s => s.completed).length}/${exercise.sets.length} подходов`
                                  : `${exercise.sets || 0} подходов`
                                }
                              </span>
                              {exercise.weightTaken ? (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Вес взят
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Вес не взят
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}