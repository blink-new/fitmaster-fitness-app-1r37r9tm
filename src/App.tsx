import { useState } from 'react'
import { Navigation } from './components/layout/Navigation'
import { HomePage } from './pages/HomePage'
import { ExercisesPage } from './pages/ExercisesPage'
import { WorkoutGeneratorPage } from './pages/WorkoutGeneratorPage'
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage'
import { ProgressPage } from './pages/ProgressPage'
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
        return <WorkoutGeneratorPage />
      case 'workout':
        return <ActiveWorkoutPage />
      case 'progress':
        return <ProgressPage />
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