import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Shuffle, Plus, Minus, RotateCcw } from 'lucide-react'
import { blink } from '@/blink/client'
import type { Exercise, Workout, WorkoutExercise } from '@/types'
import { MUSCLE_GROUPS, EXERCISE_TYPES } from '@/types'

export function WorkoutGeneratorPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([])
  const [exerciseTypesPerGroup, setExerciseTypesPerGroup] = useState<Record<string, string[]>>({})
  const [exercisesPerGroup, setExercisesPerGroup] = useState<Record<string, number>>({})
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutExercise[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const loadExercises = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const data = await blink.db.exercises.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      setExercises(data)
    } catch (error) {
      console.error('Ошибка загрузки упражнений:', error)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      loadExercises()
    }
  }, [user?.id, loadExercises])

  const handleMuscleGroupToggle = (muscleGroup: string) => {
    setSelectedMuscleGroups(prev => {
      const newGroups = prev.includes(muscleGroup)
        ? prev.filter(g => g !== muscleGroup)
        : [...prev, muscleGroup]
      
      // Инициализируем настройки для новой группы
      if (!prev.includes(muscleGroup)) {
        setExerciseTypesPerGroup(prevTypes => ({
          ...prevTypes,
          [muscleGroup]: ['main']
        }))
        setExercisesPerGroup(prevCount => ({
          ...prevCount,
          [muscleGroup]: 1
        }))
      } else {
        // Удаляем настройки для удаленной группы
        setExerciseTypesPerGroup(prevTypes => {
          const newTypes = { ...prevTypes }
          delete newTypes[muscleGroup]
          return newTypes
        })
        setExercisesPerGroup(prevCount => {
          const newCount = { ...prevCount }
          delete newCount[muscleGroup]
          return newCount
        })
      }
      
      return newGroups
    })
  }

  const handleExerciseTypeToggle = (muscleGroup: string, exerciseType: string) => {
    setExerciseTypesPerGroup(prev => ({
      ...prev,
      [muscleGroup]: prev[muscleGroup]?.includes(exerciseType)
        ? prev[muscleGroup].filter(t => t !== exerciseType)
        : [...(prev[muscleGroup] || []), exerciseType]
    }))
  }

  const handleExerciseCountChange = (muscleGroup: string, count: number) => {
    setExercisesPerGroup(prev => ({
      ...prev,
      [muscleGroup]: Math.max(1, count)
    }))
  }

  const generateWorkout = async () => {
    if (selectedMuscleGroups.length === 0) return

    setIsGenerating(true)
    try {
      const workoutExercises: WorkoutExercise[] = []
      
      for (const muscleGroup of selectedMuscleGroups) {
        const allowedTypes = exerciseTypesPerGroup[muscleGroup] || ['main']
        const exerciseCount = exercisesPerGroup[muscleGroup] || 1
        
        // Фильтруем упражнения по группе мышц и типам
        const availableExercises = exercises.filter(ex => 
          ex.muscleGroup === muscleGroup && 
          allowedTypes.includes(ex.exerciseType)
        )
        
        // Перемешиваем и берем нужное количество
        const shuffled = [...availableExercises].sort(() => Math.random() - 0.5)
        const selectedExercises = shuffled.slice(0, exerciseCount)
        
        // Добавляем в тренировку
        selectedExercises.forEach((exercise, index) => {
          workoutExercises.push({
            id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            exerciseId: exercise.id,
            exercise: exercise,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: 0, // Будет установлен пользователем
            restTime: 60, // Секунды отдыха по умолчанию
            completed: false,
            weightTaken: false,
            order: workoutExercises.length + index + 1
          })
        })
      }
      
      setGeneratedWorkout(workoutExercises)
    } catch (error) {
      console.error('Ошибка генерации тренировки:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const replaceExercise = (workoutExerciseId: string) => {
    const workoutExercise = generatedWorkout.find(we => we.id === workoutExerciseId)
    if (!workoutExercise) return

    const muscleGroup = workoutExercise.exercise.muscleGroup
    const currentExerciseType = workoutExercise.exercise.exerciseType
    
    // Находим альтернативные упражнения той же группы мышц и типа
    const alternatives = exercises.filter(ex => 
      ex.muscleGroup === muscleGroup && 
      ex.exerciseType === currentExerciseType &&
      ex.id !== workoutExercise.exerciseId &&
      !generatedWorkout.some(we => we.exerciseId === ex.id) // Исключаем уже используемые
    )
    
    if (alternatives.length === 0) {
      alert('Нет альтернативных упражнений для замены')
      return
    }
    
    // Выбираем случайное альтернативное упражнение
    const randomAlternative = alternatives[Math.floor(Math.random() * alternatives.length)]
    
    setGeneratedWorkout(prev => prev.map(we => 
      we.id === workoutExerciseId 
        ? {
            ...we,
            exerciseId: randomAlternative.id,
            exercise: randomAlternative,
            sets: randomAlternative.sets,
            reps: randomAlternative.reps
          }
        : we
    ))
  }

  const startWorkout = async () => {
    if (generatedWorkout.length === 0) return

    try {
      // Создаем тренировку в базе данных
      const workoutId = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const workout = {
        id: workoutId,
        userId: user.id,
        name: `Тренировка ${new Date().toLocaleDateString()}`,
        exercises: JSON.stringify(generatedWorkout), // Сохраняем как JSON строку
        startedAt: new Date().toISOString(),
        completedAt: null,
        status: 'active'
      }

      await blink.db.workouts.create(workout)
      
      // Сохраняем ID активной тренировки в localStorage для передачи в ActiveWorkoutPage
      localStorage.setItem('activeWorkoutId', workoutId)
      
      // Переходим к активной тренировке через навигацию
      alert('Тренировка создана! Переходите в раздел "Тренировка" для выполнения.')
    } catch (error) {
      console.error('Ошибка создания тренировки:', error)
      alert('Ошибка создания тренировки: ' + error.message)
    }
  }

  const getExerciseTypeLabel = (type: string) => {
    return EXERCISE_TYPES.find(t => t.value === type)?.label || type
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Войдите, чтобы создавать тренировки</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Генератор тренировок</h1>
          <p className="text-gray-600">Создайте персональную тренировку на основе ваших упражнений</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Настройки тренировки */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Выберите группы мышц</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MUSCLE_GROUPS.map((muscleGroup) => {
                  const exercisesCount = exercises.filter(ex => ex.muscleGroup === muscleGroup).length
                  return (
                    <div key={muscleGroup} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={muscleGroup}
                            checked={selectedMuscleGroups.includes(muscleGroup)}
                            onCheckedChange={() => handleMuscleGroupToggle(muscleGroup)}
                          />
                          <Label htmlFor={muscleGroup} className="font-medium">
                            {muscleGroup}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            {exercisesCount} упр.
                          </Badge>
                        </div>
                      </div>

                      {selectedMuscleGroups.includes(muscleGroup) && (
                        <div className="ml-6 space-y-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Типы упражнений:</Label>
                            <div className="flex flex-wrap gap-2">
                              {EXERCISE_TYPES.map((type) => (
                                <div key={type.value} className="flex items-center space-x-1">
                                  <Checkbox
                                    id={`${muscleGroup}-${type.value}`}
                                    checked={exerciseTypesPerGroup[muscleGroup]?.includes(type.value) || false}
                                    onCheckedChange={() => handleExerciseTypeToggle(muscleGroup, type.value)}
                                  />
                                  <Label htmlFor={`${muscleGroup}-${type.value}`} className="text-sm">
                                    {type.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">Количество упражнений:</Label>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExerciseCountChange(muscleGroup, (exercisesPerGroup[muscleGroup] || 1) - 1)}
                                disabled={(exercisesPerGroup[muscleGroup] || 1) <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {exercisesPerGroup[muscleGroup] || 1}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExerciseCountChange(muscleGroup, (exercisesPerGroup[muscleGroup] || 1) + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button 
                onClick={generateWorkout} 
                disabled={selectedMuscleGroups.length === 0 || isGenerating}
                className="flex-1"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                {isGenerating ? 'Генерация...' : 'Сгенерировать тренировку'}
              </Button>
              
              {generatedWorkout.length > 0 && (
                <Button onClick={() => setGeneratedWorkout([])} variant="outline">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Сгенерированная тренировка */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Ваша тренировка</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedWorkout.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Выберите группы мышц и сгенерируйте тренировку</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedWorkout.map((workoutExercise, index) => (
                      <div key={workoutExercise.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <h4 className="font-medium">{workoutExercise.exercise.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Badge variant="secondary" className="text-xs">
                                {workoutExercise.exercise.muscleGroup}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getExerciseTypeLabel(workoutExercise.exercise.exerciseType)}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => replaceExercise(workoutExercise.id)}
                          >
                            <Shuffle className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="text-xs text-gray-500">Подходы</div>
                            <div className="font-medium">{workoutExercise.sets}</div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="text-xs text-gray-500">Повторения</div>
                            <div className="font-medium">{workoutExercise.reps}</div>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-600">
                          <strong>Техника:</strong> {workoutExercise.exercise.technique.slice(0, 100)}...
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-gray-600">
                        Всего упражнений: {generatedWorkout.length}
                      </div>
                      <Button onClick={startWorkout} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Начать тренировку
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}