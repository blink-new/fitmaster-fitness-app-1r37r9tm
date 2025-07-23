import { useState } from 'react'
import { Home, Dumbbell, Zap, Play, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationProps {
  currentPage: string
  onPageChange: (page: string) => void
}

const navItems = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'exercises', label: 'Упражнения', icon: Dumbbell },
  { id: 'generator', label: 'Генератор', icon: Zap },
  { id: 'workout', label: 'Тренировка', icon: Play },
  { id: 'progress', label: 'Прогресс', icon: TrendingUp }
]

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">FitMaster</h1>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    currentPage === item.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}