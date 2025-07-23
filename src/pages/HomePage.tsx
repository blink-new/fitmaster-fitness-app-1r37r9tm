import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dumbbell, Zap, Play, TrendingUp, Plus } from 'lucide-react'
import { blink } from '@/blink/client'
import type { Workout } from '@/types'

interface HomePageProps {
  onPageChange: (page: string) => void
}

export function HomePage({ onPageChange }: HomePageProps) {
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [user, setUser] = useState<any>(null)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const workouts = await blink.db.workouts.list({
        where: { userId: user.id },
        orderBy: { startedAt: 'desc' },
        limit: 5
      })
      
      // Парсим упражнения из JSON строк
      const parsedWorkouts = workouts.map(workout => ({
        ...workout,
        exercises: JSON.parse(workout.exercises || '[]')
      }))
      
      setRecentWorkouts(parsedWorkouts)
      
      const active = parsedWorkouts.find(w => w.status === 'active')
      setActiveWorkout(active || null)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    }
  }, [user?.id])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id, loadData])

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать в FitMaster</h2>
          <p className="text-gray-600">Войдите, чтобы начать тренировки</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Привет, {user.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-600">Готов к новой тренировке?</p>
        </div>

        {/* Активная тренировка */}
        {activeWorkout && (
          <Card className="mb-8 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-amber-800">
                <Play className="h-5 w-5" />
                <span>Активная тренировка</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-amber-900">{activeWorkout.name}</h3>
                  <p className="text-sm text-amber-700">
                    Начата: {new Date(activeWorkout.startedAt).toLocaleString('ru')}
                  </p>
                </div>
                <Button 
                  onClick={() => onPageChange('workout')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Продолжить
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Быстрые действия */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onPageChange('exercises')}>
            <CardContent className="p-6 text-center">
              <Dumbbell className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Упражнения</h3>
              <p className="text-sm text-gray-600">Управление базой упражнений</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onPageChange('generator')}>
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Генератор</h3>
              <p className="text-sm text-gray-600">Создать новую тренировку</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onPageChange('workout')}>
            <CardContent className="p-6 text-center">
              <Play className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Тренировка</h3>
              <p className="text-sm text-gray-600">Выполнить тренировку</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onPageChange('progress')}>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Прогресс</h3>
              <p className="text-sm text-gray-600">Отслеживание результатов</p>
            </CardContent>
          </Card>
        </div>

        {/* Последние тренировки */}
        <Card>
          <CardHeader>
            <CardTitle>Последние тренировки</CardTitle>
          </CardHeader>
          <CardContent>
            {recentWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">У вас пока нет тренировок</p>
                <Button onClick={() => onPageChange('generator')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первую тренировку
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{workout.name}</h4>
                      <p className="text-sm text-gray-600">
                        {workout.completedAt 
                          ? `Завершена: ${new Date(workout.completedAt).toLocaleString('ru')}`
                          : `Создана: ${new Date(workout.startedAt).toLocaleString('ru')}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {workout.status === 'active' && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                          Активна
                        </span>
                      )}
                      {workout.completedAt && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Завершена
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}