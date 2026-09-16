import { useState, useEffect } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'

interface CombatSetting {
  name: string
  multiplier: number
}

interface CombatSettingsProps {
  onMultiplierChange?: (multiplier: number) => void
}

function CombatSettings({ onMultiplierChange }: CombatSettingsProps) {
  const [combatSettings, setCombatSettings] = useState<CombatSetting[]>([])
  // Defaults to 1 (Normal) the first time; persisted afterward.
  const [selectedMultiplier, setSelectedMultiplier] = usePersistentState<number>('combatMultiplier', 1)

  useEffect(() => {
    onMultiplierChange?.(selectedMultiplier)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMultiplier])

  useEffect(() => {
    fetch('/data/combat_settings.json')
      .then((response) => response.json())
      .then((data: CombatSetting[]) => {
        setCombatSettings(data)
      })
      .catch((error) => {
        console.error('Error loading combat settings:', error)
      })
  }, [])

  const handleCombatSettingClick = (multiplier: number) => {
    setSelectedMultiplier(multiplier)
    onMultiplierChange?.(multiplier)
  }

  return (
    <div className="combat-settings">
      <h2>Combat Difficulty</h2>
      <div className="combat-buttons">
        {combatSettings.map((setting) => (
          <button
            key={setting.name}
            className={`combat-button ${
              selectedMultiplier === setting.multiplier ? 'active' : ''
            }`}
            onClick={() => handleCombatSettingClick(setting.multiplier)}
          >
            {setting.name}
          </button>
        ))}
      </div>
      {selectedMultiplier && (
        <p className="selected-multiplier">
          Selected: {selectedMultiplier}x multiplier
        </p>
      )}
    </div>
  )
}

export default CombatSettings

