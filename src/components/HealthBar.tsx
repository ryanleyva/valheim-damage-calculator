import { useState, useEffect } from 'react'

interface HealthBarProps {
  onHealthChange?: (health: number) => void
}

function HealthBar({ onHealthChange }: HealthBarProps) {
  const [health, setHealth] = useState<number>(100)

  useEffect(() => {
    onHealthChange?.(health)
  }, [health, onHealthChange])

  const handleHealthChange = (newHealth: number) => {
    setHealth(newHealth)
    onHealthChange?.(newHealth)
  }

  return (
    <div className="health-bar-container">
      <div className="health-bar">
        <label htmlFor="health-slider" className="health-label">
          Player Health: {health}
        </label>
        <input
          id="health-slider"
          type="range"
          min="25"
          max="500"
          value={health}
          onChange={(e) => handleHealthChange(Number(e.target.value))}
          className="health-slider"
        />
        <div className="health-range">
          <span>25</span>
          <span>500</span>
        </div>
      </div>
    </div>
  )
}

export default HealthBar

