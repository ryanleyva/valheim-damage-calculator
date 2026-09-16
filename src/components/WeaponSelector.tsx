import { useState, useEffect, useMemo } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'

export interface WeaponItem {
  prefab: string
  displayName: string
  weaponType: string
  twoHanded: boolean
  blockPower: number
  blockPowerPerLevel: number
  blockForce: number
  blockForcePerLevel: number
  parryBonus: number
}

export interface SelectedWeapon {
  item: WeaponItem
  level: number
  blockPower: number
  blockForce: number
  parryForce: number
}

interface WeaponSelectorProps {
  onWeaponChange?: (weapon: SelectedWeapon | null) => void
}

const WEAPON_MAX_LEVEL = 3

function WeaponSelector({ onWeaponChange }: WeaponSelectorProps) {
  const [weapons, setWeapons] = useState<WeaponItem[]>([])
  const [selectedWeapon, setSelectedWeapon] = usePersistentState<string>('selectedWeapon', '')
  const [weaponLevel, setWeaponLevel] = usePersistentState<number>('weaponLevel', 0)

  useEffect(() => {
    fetch('/data/weapons.json')
      .then((res) => res.json())
      .then((raw: { data?: WeaponItem[] } | WeaponItem[]) => {
        const data: WeaponItem[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setWeapons(Array.isArray(data) ? data : [])
      })
      .catch((err) => console.error('Error loading weapons:', err))
  }, [])

  const currentWeapon = useMemo(
    () => weapons.find((w) => w.prefab === selectedWeapon) ?? null,
    [weapons, selectedWeapon]
  )

  const blockPower = currentWeapon
    ? currentWeapon.blockPower + currentWeapon.blockPowerPerLevel * weaponLevel
    : 0
  const blockForce = currentWeapon
    ? currentWeapon.blockForce + currentWeapon.blockForcePerLevel * weaponLevel
    : 0
  const parryForce = currentWeapon ? blockPower * currentWeapon.parryBonus : 0

  useEffect(() => {
    if (!currentWeapon) {
      onWeaponChange?.(null)
      return
    }
    onWeaponChange?.({
      item: currentWeapon,
      level: weaponLevel,
      blockPower,
      blockForce,
      parryForce,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeapon, weaponLevel, blockPower, blockForce, parryForce])

  const handleWeaponChange = (prefab: string) => {
    setSelectedWeapon(prefab)
    setWeaponLevel(0)
  }

  return (
    <div className="weapon-selector">
      <h2>Select Weapon</h2>
      <div className="armor-dropdown-group">
        <label htmlFor="weapon-select" className="armor-label">
          Weapon:
        </label>
        <div className="armor-slot-row">
          <select
            id="weapon-select"
            value={selectedWeapon}
            onChange={(e) => handleWeaponChange(e.target.value)}
            className="armor-dropdown"
          >
            <option value="">-- None --</option>
            {weapons
              .slice()
              .sort((a, b) => a.displayName.localeCompare(b.displayName))
              .map((item) => (
                <option key={item.prefab} value={item.prefab}>
                  {item.displayName}
                </option>
              ))}
          </select>
          {currentWeapon && (
            <div className="armor-level-slider">
              <input
                type="range"
                min={0}
                max={WEAPON_MAX_LEVEL}
                value={weaponLevel}
                onChange={(e) => setWeaponLevel(Number(e.target.value))}
                className="armor-level-input"
              />
              <span className="armor-level-label">+{weaponLevel}</span>
            </div>
          )}
        </div>
      </div>
      {currentWeapon && (
        <div className="shield-stats">
          <span className="shield-stat-badge">Type: {currentWeapon.weaponType}{currentWeapon.twoHanded ? ' (Two-Handed)' : ''}</span>
          <span className="shield-stat-badge">Block Power: {blockPower}</span>
          <span className="shield-stat-badge">Block Force: {blockForce}</span>
          <span className="shield-stat-badge">Parry Bonus: {currentWeapon.parryBonus}x</span>
          <span className="shield-stat-badge">Parry Force: {Math.round(parryForce * 100) / 100}</span>
        </div>
      )}
    </div>
  )
}

export default WeaponSelector
