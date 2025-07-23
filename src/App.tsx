import { useState } from 'react'
import { Navigation } from './components/layout/Navigation'
import { HomePage } from './pages/HomePage'
import { ExercisesPage } from './pages/ExercisesPage'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={setCurrentPage} />
      case 'exercises':
        return <ExercisesPage />
      case 'generator':
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-gray-600">Генератор тренировок - в разработке</p>
        </div>
      case 'workout':
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-gray-600">Активная тренировка - в разработке</p>
        </div>
      case 'progress':
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-gray-600">Прогресс - в разработке</p>
        </div>
      default:
        return <HomePage onPageChange={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      {renderPage()}
    </div>
  )
}

export default App