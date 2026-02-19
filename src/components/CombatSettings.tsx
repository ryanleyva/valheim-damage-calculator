import { useState, useEffect } from 'react'

interface CombatSetting {
  name: string
  multiplier: number
}

interface CombatSettingsProps {
  onMultiplierChange?: (multiplier: number) => void
}

function CombatSettings({ onMultiplierChange }: CombatSettingsProps) {
  const [combatSettings, setCombatSettings] = useState<CombatSetting[]>([])
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1)

  useEffect(() => {
    fetch('/data/combat_settings.json')
      .then((response) => response.json())
      .then((data: CombatSetting[]) => {
        setCombatSettings(data)
        // Set default to Normal (multiplier 1)
        const normal = data.find((setting) => setting.multiplier === 1)
        if (normal) {
          setSelectedMultiplier(normal.multiplier)
          onMultiplierChange?.(normal.multiplier)
        }
      })
      .catch((error) => {
        console.error('Error loading combat settings:', error)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

