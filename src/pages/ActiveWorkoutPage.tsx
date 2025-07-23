import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  X, 
  Timer, 
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Save
} from 'lucide-react'
import { blink } from '@/blink/client'
import type { Workout, WorkoutExercise, WorkoutSet } from '@/types'

export function ActiveWorkoutPage() {
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isRestTimer, setIsRestTimer] = useState(false)
  const [restTime, setRestTime] = useState(60)
  const [showWeightDialog, setShowWeightDialog] = useState(false)
  const [tempWeight, setTempWeight] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    // Получаем ID активной тренировки из localStorage
    const activeWorkoutId = localStorage.getItem('activeWorkoutId')
    if (activeWorkoutId) {
      setWorkoutId(activeWorkoutId)
    }
  }, [])

  useEffect(() => {
    const loadWorkout = async () => {
      if (!user?.id || !workoutId) {
        console.log('Нет пользователя или ID тренировки:', { userId: user?.id, workoutId })
        return
      }
      
      console.log('Загружаем тренировку:', { userId: user.id, workoutId })
      
      try {
        const data = await blink.db.workouts.list({
          where: { 
            userId: user.id,
            id: workoutId
          }
        })
        
        console.log('Результат запроса тренировки:', data)
        
        if (data.length > 0) {
          const workoutData = data[0]
          console.log('Данные тренировки:', workoutData)
          
          // Парсим упражнения из JSON строки
          let exercises: WorkoutExercise[]
          try {
            exercises = JSON.parse(workoutData.exercises)
            console.log('Парсинг упражнений успешен:', exercises)
          } catch (e) {
            console.error('Ошибка парсинга упражнений:', e)
            return
          }
          
          // Инициализируем подходы для каждого упражнения
          const exercisesWithSets = exercises.map((exercise: WorkoutExercise) => ({
            ...exercise,
            sets: Array.from({ length: typeof exercise.sets === 'number' ? exercise.sets : exercise.sets.length }, (_, index) => ({
              id: `set_${exercise.id}_${index}`,
              setNumber: index + 1,
              reps: exercise.reps,
              weight: 0,
              completed: false,
              restTime: exercise.restTime || 60
            } as WorkoutSet))
          }))
          
          console.log('Упражнения с подходами:', exercisesWithSets)
          
          setWorkout({
            ...workoutData,
            exercises: exercisesWithSets
          })
        } else {
          console.log('Тренировка не найдена')
        }
      } catch (error) {
        console.error('Ошибка загрузки тренировки:', error)
      }
    }

    if (user?.id && workoutId) {
      loadWorkout()
    }
  }, [user?.id, workoutId])

  // Таймер
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            if (isRestTimer) {
              // Звуковое уведомление (если поддерживается)
              try {
                new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT').play()
              } catch (e) {
                // Игнорируем ошибки звука
              }
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => clearInterval(interval)
  }, [isTimerRunning, timerSeconds, isRestTimer])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = (seconds: number, isRest = false) => {
    setTimerSeconds(seconds)
    setIsRestTimer(isRest)
    setIsTimerRunning(true)
  }

  const pauseTimer = () => {
    setIsTimerRunning(false)
  }

  const resetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
    setIsRestTimer(false)
  }

  const getCurrentExercise = () => {
    if (!workout || currentExerciseIndex >= workout.exercises.length) return null
    return workout.exercises[currentExerciseIndex]
  }

  const getCurrentSet = () => {
    const exercise = getCurrentExercise()
    if (!exercise || currentSetIndex >= exercise.sets.length) return null
    return exercise.sets[currentSetIndex]
  }

  const completeSet = async (weight: number, completed: boolean) => {
    if (!workout) return

    const updatedWorkout = { ...workout }
    const exercise = updatedWorkout.exercises[currentExerciseIndex]
    const set = exercise.sets[currentSetIndex]
    
    set.weight = weight
    set.completed = completed
    
    setWorkout(updatedWorkout)
    
    // Сохраняем в базу данных
    try {
      await blink.db.workouts.update(workout.id, {
        ...updatedWorkout,
        exercises: JSON.stringify(updatedWorkout.exercises)
      })
    } catch (error) {
      console.error('Ошибка сохранения подхода:', error)
    }

    // Если подход завершен, запускаем таймер отдыха
    if (completed && currentSetIndex < exercise.sets.length - 1) {
      startTimer(set.restTime, true)
    }

    // Переходим к следующему подходу или упражнению
    if (currentSetIndex < exercise.sets.length - 1) {
      setCurrentSetIndex(prev => prev + 1)
    } else if (currentExerciseIndex < workout.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
      setCurrentSetIndex(0)
    }
  }

  const handleWeightSubmit = (completed: boolean) => {
    const weight = parseFloat(tempWeight) || 0
    completeSet(weight, completed)
    setShowWeightDialog(false)
    setTempWeight('')
  }

  const markExerciseComplete = async () => {
    if (!workout) return

    const exercise = getCurrentExercise()
    if (!exercise) return

    // Отмечаем упражнение как выполненное
    const updatedWorkout = { ...workout }
    updatedWorkout.exercises[currentExerciseIndex].completed = true
    
    // Определяем, взят ли вес (все подходы выполнены)
    const allSetsCompleted = exercise.sets.every(set => set.completed)
    updatedWorkout.exercises[currentExerciseIndex].weightTaken = allSetsCompleted

    setWorkout(updatedWorkout)
    
    try {
      await blink.db.workouts.update(workout.id, {
        ...updatedWorkout,
        exercises: JSON.stringify(updatedWorkout.exercises)
      })
    } catch (error) {
      console.error('Ошибка сохранения упражнения:', error)
    }
  }

  const finishWorkout = async () => {
    if (!workout) return

    const updatedWorkout = {
      ...workout,
      completedAt: new Date().toISOString(),
      status: 'completed' as const
    }

    try {
      await blink.db.workouts.update(workout.id, {
        ...updatedWorkout,
        exercises: JSON.stringify(updatedWorkout.exercises)
      })
      // Очищаем localStorage
      localStorage.removeItem('activeWorkoutId')
      alert('Тренировка завершена! Переходите в раздел "Прогресс" для просмотра результатов.')
    } catch (error) {
      console.error('Ошибка завершения тренировки:', error)
    }
  }

  const getProgress = () => {
    if (!workout) return 0
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    const completedSets = workout.exercises.reduce((sum, ex) => 
      sum + ex.sets.filter(set => set.completed).length, 0
    )
    return totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Войдите, чтобы продолжить тренировку</p>
        </div>
      </div>
    )
  }

  if (!workoutId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Нет активной тренировки</p>
          <p className="text-sm text-gray-500">Создайте тренировку в разделе "Генератор"</p>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Загрузка тренировки...</p>
        </div>
      </div>
    )
  }

  const currentExercise = getCurrentExercise()
  const currentSet = getCurrentSet()
  const progress = getProgress()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Заголовок и прогресс */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{workout.name}</h1>
            <Button onClick={finishWorkout} variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Завершить
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Прогресс тренировки</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Таймер */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Timer className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-mono font-bold">
                    {formatTime(timerSeconds)}
                  </span>
                </div>
                {isRestTimer && (
                  <Badge variant="secondary">Отдых</Badge>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startTimer(restTime, true)}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isTimerRunning ? pauseTimer : () => setIsTimerRunning(true)}
                  disabled={timerSeconds === 0}
                >
                  {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetTimer}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Текущее упражнение */}
        {currentExercise && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    {currentExercise.exercise.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {currentExercise.exercise.muscleGroup}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Упражнение {currentExerciseIndex + 1} из {workout.exercises.length}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (currentExerciseIndex > 0) {
                        setCurrentExerciseIndex(prev => prev - 1)
                        setCurrentSetIndex(0)
                      }
                    }}
                    disabled={currentExerciseIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (currentExerciseIndex < workout.exercises.length - 1) {
                        setCurrentExerciseIndex(prev => prev + 1)
                        setCurrentSetIndex(0)
                      }
                    }}
                    disabled={currentExerciseIndex === workout.exercises.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm">
                  <strong>Техника:</strong> {currentExercise.exercise.technique}
                </div>
                
                <Separator />
                
                {/* Подходы */}
                <div>
                  <h4 className="font-medium mb-3">
                    Подходы ({currentSetIndex + 1} из {currentExercise.sets.length})
                  </h4>
                  
                  <div className="space-y-2">
                    {currentExercise.sets.map((set, index) => (
                      <div
                        key={set.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index === currentSetIndex 
                            ? 'border-blue-500 bg-blue-50' 
                            : set.completed 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <span className="font-medium">#{set.setNumber}</span>
                          <span className="text-sm text-gray-600">
                            {set.reps} повторений
                          </span>
                          {set.weight > 0 && (
                            <span className="text-sm font-medium">
                              {set.weight} кг
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {set.completed ? (
                            <Badge variant="default" className="bg-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Выполнено
                            </Badge>
                          ) : index === currentSetIndex ? (
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setTempWeight(set.weight.toString())
                                  setShowWeightDialog(true)
                                }}
                              >
                                Выполнить
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline">Ожидание</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Диалог ввода веса */}
        <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Результат подхода</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="weight">Вес (кг)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.5"
                  value={tempWeight}
                  onChange={(e) => setTempWeight(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleWeightSubmit(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Вес взят
                </Button>
                <Button
                  onClick={() => handleWeightSubmit(false)}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Вес не взят
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}