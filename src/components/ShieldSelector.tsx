import { useState, useEffect, useMemo } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'

export interface ShieldItem {
  prefab: string
  displayName: string
  shieldType: 'Buckler' | 'Round' | 'Tower'
  blockPower: number
  blockPowerPerLevel: number
  blockForce: number
  blockForcePerLevel: number
  parryBonus: number
  movementModifier: number
}

export interface SelectedShield {
  item: ShieldItem
  level: number
  blockPower: number
  blockForce: number
  parryForce: number | null
}

interface ShieldSelectorProps {
  onShieldChange?: (shield: SelectedShield | null) => void
}

const SHIELD_MAX_LEVEL = 2

function ShieldSelector({ onShieldChange }: ShieldSelectorProps) {
  const [shields, setShields] = useState<ShieldItem[]>([])
  const [selectedShield, setSelectedShield] = usePersistentState<string>('selectedShield', '')
  const [shieldLevel, setShieldLevel] = usePersistentState<number>('shieldLevel', 0)

  useEffect(() => {
    fetch('/data/shields.json')
      .then((res) => res.json())
      .then((raw: { data?: ShieldItem[] } | ShieldItem[]) => {
        const data: ShieldItem[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setShields(Array.isArray(data) ? data : [])
      })
      .catch((err) => console.error('Error loading shields:', err))
  }, [])

  const currentShield = useMemo(
    () => shields.find((s) => s.prefab === selectedShield) ?? null,
    [shields, selectedShield]
  )

  const blockPower = currentShield
    ? currentShield.blockPower + currentShield.blockPowerPerLevel * shieldLevel
    : 0
  const blockForce = currentShield
    ? currentShield.blockForce + currentShield.blockForcePerLevel * shieldLevel
    : 0
  const parryForce = currentShield && currentShield.parryBonus > 0 ? blockPower * currentShield.parryBonus : null

  useEffect(() => {
    if (!currentShield) {
      onShieldChange?.(null)
      return
    }
    onShieldChange?.({
      item: currentShield,
      level: shieldLevel,
      blockPower,
      blockForce,
      parryForce,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShield, shieldLevel, blockPower, blockForce, parryForce])

  const handleShieldChange = (prefab: string) => {
    setSelectedShield(prefab)
    setShieldLevel(0)
  }

  return (
    <div className="shield-selector">
      <h2>Select Shield</h2>
      <div className="armor-dropdown-group">
        <label htmlFor="shield-select" className="armor-label">
          Shield:
        </label>
        <div className="armor-slot-row">
          <select
            id="shield-select"
            value={selectedShield}
            onChange={(e) => handleShieldChange(e.target.value)}
            className="armor-dropdown"
          >
            <option value="">-- None --</option>
            {shields
              .slice()
              .sort((a, b) => a.displayName.localeCompare(b.displayName))
              .map((item) => (
                <option key={item.prefab} value={item.prefab}>
                  {item.displayName}
                </option>
              ))}
          </select>
          {currentShield && (
            <div className="armor-level-slider">
              <input
                type="range"
                min={0}
                max={SHIELD_MAX_LEVEL}
                value={shieldLevel}
                onChange={(e) => setShieldLevel(Number(e.target.value))}
                className="armor-level-input"
              />
              <span className="armor-level-label">+{shieldLevel}</span>
            </div>
          )}
        </div>
      </div>
      {currentShield && (
        <div className="shield-stats">
          <span className="shield-stat-badge">Type: {currentShield.shieldType}</span>
          <span className="shield-stat-badge">Block Power: {blockPower}</span>
          <span className="shield-stat-badge">Block Force: {blockForce}</span>
          <span className="shield-stat-badge">
            Parry Bonus: {currentShield.parryBonus > 0 ? `${currentShield.parryBonus}x` : 'Cannot Parry'}
          </span>
          {parryForce != null && (
            <span className="shield-stat-badge">Parry Force: {Math.round(parryForce * 100) / 100}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default ShieldSelector
