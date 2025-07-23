import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { blink } from '@/blink/client'
import type { Exercise } from '@/types'
import { MUSCLE_GROUPS, EXERCISE_TYPES, WEIGHT_TYPES } from '@/types'

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all')
  const [selectedExerciseType, setSelectedExerciseType] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    weightType: 'bodyweight' as const,
    technique: '',
    sets: 3,
    reps: 10,
    exerciseType: 'main' as const,
    equipmentName: '',
    equipmentSettings: '',
    equipmentPhoto: ''
  })

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

  // Фильтрация упражнений
  useEffect(() => {
    let filtered = exercises

    if (searchTerm) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedMuscleGroup !== 'all') {
      filtered = filtered.filter(exercise => exercise.muscleGroup === selectedMuscleGroup)
    }

    if (selectedExerciseType !== 'all') {
      filtered = filtered.filter(exercise => exercise.exerciseType === selectedExerciseType)
    }

    setFilteredExercises(filtered)
  }, [exercises, searchTerm, selectedMuscleGroup, selectedExerciseType])

  const resetForm = () => {
    setFormData({
      name: '',
      muscleGroup: '',
      weightType: 'bodyweight',
      technique: '',
      sets: 3,
      reps: 10,
      exerciseType: 'main',
      equipmentName: '',
      equipmentSettings: '',
      equipmentPhoto: ''
    })
    setEditingExercise(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      const exerciseData = {
        ...formData,
        userId: user.id,
        id: editingExercise?.id || `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      if (editingExercise) {
        await blink.db.exercises.update(editingExercise.id, exerciseData)
      } else {
        await blink.db.exercises.create(exerciseData)
      }

      await loadExercises()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Ошибка сохранения упражнения:', error)
    }
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weightType: exercise.weightType,
      technique: exercise.technique,
      sets: exercise.sets,
      reps: exercise.reps,
      exerciseType: exercise.exerciseType,
      equipmentName: exercise.equipmentName || '',
      equipmentSettings: exercise.equipmentSettings || '',
      equipmentPhoto: exercise.equipmentPhoto || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить упражнение?')) return

    try {
      await blink.db.exercises.delete(id)
      await loadExercises()
    } catch (error) {
      console.error('Ошибка удаления упражнения:', error)
    }
  }

  const getExerciseTypeLabel = (type: string) => {
    return EXERCISE_TYPES.find(t => t.value === type)?.label || type
  }

  const getWeightTypeLabel = (type: string) => {
    return WEIGHT_TYPES.find(t => t.value === type)?.label || type
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Войдите, чтобы управлять упражнениями</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Упражнения</h1>
            <p className="text-gray-600">Управление базой упражнений</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить упражнение
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingExercise ? 'Редактировать упражнение' : 'Новое упражнение'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Название упражнения *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="muscleGroup">Группа мышц *</Label>
                    <Select value={formData.muscleGroup} onValueChange={(value) => setFormData({ ...formData, muscleGroup: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите группу мышц" />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSCLE_GROUPS.map((group) => (
                          <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="weightType">Тип веса *</Label>
                    <Select value={formData.weightType} onValueChange={(value: any) => setFormData({ ...formData, weightType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEIGHT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="exerciseType">Тип упражнения *</Label>
                    <Select value={formData.exerciseType} onValueChange={(value: any) => setFormData({ ...formData, exerciseType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXERCISE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sets">Подходы *</Label>
                    <Input
                      id="sets"
                      type="number"
                      min="1"
                      value={formData.sets}
                      onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reps">Повторения *</Label>
                    <Input
                      id="reps"
                      type="number"
                      min="1"
                      value={formData.reps}
                      onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="technique">Техника выполнения *</Label>
                  <Textarea
                    id="technique"
                    value={formData.technique}
                    onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                    placeholder="Опишите технику выполнения упражнения..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="equipmentName">Название тренажера</Label>
                    <Input
                      id="equipmentName"
                      value={formData.equipmentName}
                      onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                      placeholder="Например: Жим лежа"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="equipmentPhoto">Фото тренажера (URL)</Label>
                    <Input
                      id="equipmentPhoto"
                      value={formData.equipmentPhoto}
                      onChange={(e) => setFormData({ ...formData, equipmentPhoto: e.target.value })}
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="equipmentSettings">Настройки тренажера</Label>
                  <Textarea
                    id="equipmentSettings"
                    value={formData.equipmentSettings}
                    onChange={(e) => setFormData({ ...formData, equipmentSettings: e.target.value })}
                    placeholder="Высота сиденья, угол наклона и т.д."
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">
                    {editingExercise ? 'Сохранить' : 'Создать'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Фильтры */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Поиск упражнений..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Все группы мышц" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все группы мышц</SelectItem>
                  {MUSCLE_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedExerciseType} onValueChange={setSelectedExerciseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {EXERCISE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="text-sm text-gray-600 flex items-center">
                Найдено: {filteredExercises.length} упражнений
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Список упражнений */}
        {filteredExercises.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">
                {exercises.length === 0 ? 'У вас пока нет упражнений' : 'Упражнения не найдены'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить первое упражнение
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{exercise.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{exercise.muscleGroup}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(exercise)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(exercise.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{getExerciseTypeLabel(exercise.exerciseType)}</Badge>
                      <Badge variant="outline">{getWeightTypeLabel(exercise.weightType)}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Подходы:</span> {exercise.sets}
                      </div>
                      <div>
                        <span className="font-medium">Повторения:</span> {exercise.reps}
                      </div>
                    </div>
                    
                    {exercise.equipmentName && (
                      <div className="text-sm">
                        <span className="font-medium">Тренажер:</span> {exercise.equipmentName}
                      </div>
                    )}
                    
                    <div className="text-sm">
                      <span className="font-medium">Техника:</span>
                      <p className="text-gray-600 mt-1 line-clamp-3">{exercise.technique}</p>
                    </div>
                    
                    {exercise.equipmentPhoto && (
                      <div className="mt-3">
                        <img
                          src={exercise.equipmentPhoto}
                          alt={exercise.equipmentName || 'Тренажер'}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}