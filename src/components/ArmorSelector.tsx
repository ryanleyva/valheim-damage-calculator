import { useState, useEffect, useMemo } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'

interface ArmorItem {
  prefab: string
  displayName: string
  itemType: string
  armor: number
  armorPerLevel: number
  movementModifier: number
  setName: string
  setSize: number
  equipStatusEffect: string | null
  setStatusEffect: string | null
  armorDamageModifiers: Record<string, string> | null
}

interface Consumable {
  prefab: string
  displayName: string
  damageModifiers: Record<string, string>
}

interface ArmorSelectorProps {
  onArmorChange?: (armor: {
    chest: ArmorItem | null
    legs: ArmorItem | null
    helmet: ArmorItem | null
    shoulder: ArmorItem | null
  }) => void
  onTotalArmorChange?: (total: number) => void
  onResistancesChange?: (resistances: Record<string, number>) => void
  onBonemassChange?: (enabled: boolean) => void
  onConsumableChange?: (consumable: Consumable | null) => void
}

interface ArmorRename {
  oldName: string
  newName: string
}

function ArmorSelector({ onArmorChange, onTotalArmorChange, onResistancesChange, onBonemassChange, onConsumableChange }: ArmorSelectorProps) {
  const [armorItems, setArmorItems] = useState<ArmorItem[]>([])
  const [armorRenameMap, setArmorRenameMap] = useState<Record<string, string>>({})
  const [damageResistanceMap, setDamageResistanceMap] = useState<Record<string, number>>({})
  const [selectedChest, setSelectedChest] = usePersistentState<string>('selectedChest', '')
  const [selectedLegs, setSelectedLegs] = usePersistentState<string>('selectedLegs', '')
  const [selectedHelmet, setSelectedHelmet] = usePersistentState<string>('selectedHelmet', '')
  const [selectedShoulder, setSelectedShoulder] = usePersistentState<string>('selectedShoulder', '')
  const [chestLevel, setChestLevel] = usePersistentState<number>('chestLevel', 0)
  const [legsLevel, setLegsLevel] = usePersistentState<number>('legsLevel', 0)
  const [helmetLevel, setHelmetLevel] = usePersistentState<number>('helmetLevel', 0)
  const [shoulderLevel, setShoulderLevel] = usePersistentState<number>('shoulderLevel', 0)
  const [bonemassEnabled, setBonemassEnabled] = usePersistentState<boolean>('bonemassEnabled', false)
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [selectedConsumables, setSelectedConsumables] = usePersistentState<string[]>('selectedConsumables', [''])

  const ARMOR_MAX_LEVEL = 4

  useEffect(() => {
    onBonemassChange?.(bonemassEnabled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonemassEnabled])

  useEffect(() => {
    const items = selectedConsumables
      .map((prefab) => (prefab ? consumables.find((c) => c.prefab === prefab) ?? null : null))
      .filter((c): c is Consumable => c != null)
    onConsumableChange?.(items.length > 0 ? items[0] : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConsumables, consumables])

  useEffect(() => {
    fetch('/data/consumables_20260210_030315.json')
      .then((res) => res.json())
      .then((raw: { data?: Consumable[] } | Consumable[]) => {
        const data: Consumable[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        if (!Array.isArray(data)) {
          setConsumables([])
          return
        }
        const withModifiers = data.filter(
          (c): c is Consumable => c.damageModifiers != null && Object.keys(c.damageModifiers).length > 0
        )
        setConsumables(withModifiers)
      })
      .catch((err) => console.error('Error loading consumables:', err))
  }, [])

  useEffect(() => {
    fetch('/data/damage_resistance.json')
      .then((res) => res.json())
      .then((map: Record<string, number>) => {
        setDamageResistanceMap(map)
      })
      .catch((err) => console.error('Error loading damage resistance:', err))
  }, [])

  useEffect(() => {
    fetch('/data/armor_rename.json')
      .then((res) => res.json())
      .then((list: ArmorRename[]) => {
        const map: Record<string, string> = {}
        list.forEach(({ oldName, newName }) => {
          map[oldName] = newName
          map[oldName.toLowerCase()] = newName
        })
        setArmorRenameMap(map)
      })
      .catch((err) => console.error('Error loading armor renames:', err))
  }, [])

  useEffect(() => {
    fetch('/data/armor_20260207_153953.json')
      .then((response) => response.json())
      .then((raw: { data?: ArmorItem[] } | ArmorItem[]) => {
        const data: ArmorItem[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        if (!Array.isArray(data)) {
          setArmorItems([])
          return
        }
        // Remove duplicate armors by prefab (keep first occurrence, case-insensitive)
        const seen = new Set<string>()
        const unique = data.filter((item) => {
          const key = (item.prefab ?? '').toLowerCase()
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
        setArmorItems(unique)
      })
      .catch((error) => {
        console.error('Error loading armor:', error)
      })
  }, [])

  // Filter armor by item type
  const chestArmor = useMemo(() => {
    return armorItems.filter((item) => item.itemType === 'Chest')
  }, [armorItems])

  const legsArmor = useMemo(() => {
    return armorItems.filter((item) => item.itemType === 'Legs')
  }, [armorItems])

  const helmetArmor = useMemo(() => {
    return armorItems.filter((item) => item.itemType === 'Helmet')
  }, [armorItems])

  const shoulderArmor = useMemo(() => {
    return armorItems.filter((item) => item.itemType === 'Shoulder')
  }, [armorItems])

  // Format prefab name: convert underscores to spaces and capitalize first letter of each word
  const formatPrefabName = (prefab: string) => {
    return prefab
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getArmorDisplayName = (item: ArmorItem) => {
    const key = item.prefab
    const renamed = armorRenameMap[key] ?? armorRenameMap[key?.toLowerCase() ?? '']
    if (renamed) return renamed
    return item.displayName?.trim() || formatPrefabName(item.prefab)
  }

  const armorWithLevel = (item: ArmorItem | null | undefined, level: number) =>
    item ? item.armor + (item.armorPerLevel ?? 0) * level : 0

  const totalArmor = useMemo(() => {
    const chest = selectedChest ? armorItems.find((i) => i.prefab === selectedChest) ?? null : null
    const legs = selectedLegs ? armorItems.find((i) => i.prefab === selectedLegs) ?? null : null
    const helmet = selectedHelmet ? armorItems.find((i) => i.prefab === selectedHelmet) ?? null : null
    const shoulder = selectedShoulder ? armorItems.find((i) => i.prefab === selectedShoulder) ?? null : null
    return (
      armorWithLevel(chest, chestLevel) +
      armorWithLevel(legs, legsLevel) +
      armorWithLevel(helmet, helmetLevel) +
      armorWithLevel(shoulder, shoulderLevel)
    )
  }, [selectedChest, selectedLegs, selectedHelmet, selectedShoulder, chestLevel, legsLevel, helmetLevel, shoulderLevel, armorItems])

  useEffect(() => {
    onTotalArmorChange?.(totalArmor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalArmor])

  const selectedArmorPieces = useMemo(() => {
    const chest = selectedChest ? armorItems.find((i) => i.prefab === selectedChest) : null
    const legs = selectedLegs ? armorItems.find((i) => i.prefab === selectedLegs) : null
    const helmet = selectedHelmet ? armorItems.find((i) => i.prefab === selectedHelmet) : null
    const shoulder = selectedShoulder ? armorItems.find((i) => i.prefab === selectedShoulder) : null
    return [
      { slot: 'Chest', item: chest },
      { slot: 'Legs', item: legs },
      { slot: 'Helmet', item: helmet },
      { slot: 'Shoulder', item: shoulder },
    ].filter((p) => p.item != null)
  }, [selectedChest, selectedLegs, selectedHelmet, selectedShoulder, armorItems])

  const getResistanceValue = (level: string) => {
    const val = damageResistanceMap[level] ?? damageResistanceMap[level?.toLowerCase() ?? '']
    return val != null ? val : null
  }

  // Combined resistances from armor + consumables. A consumable's modifier for a damage
  // type completely overrides any armor modifier for that same type (not "best wins") -
  // e.g. a Weak fire armor modifier is fully negated by a Fire Resistance mead, even
  // though the reverse (a better armor modifier losing to a worse potion) can also happen.
  // Multiple armor pieces modifying the same type still combine via best-wins.
  const combinedResistances = useMemo(() => {
    const getMult = (level: string) =>
      damageResistanceMap[level] ?? damageResistanceMap[level?.toLowerCase() ?? ''] ?? null
    const collectModifiers = (sources: (Record<string, string> | null | undefined)[]) => {
      const byType: Record<string, number> = {}
      sources.forEach((mods) => {
        if (!mods) return
        Object.entries(mods).forEach(([dmgType, level]) => {
          const key = dmgType.toLowerCase()
          const mult = getMult(level)
          if (mult != null) {
            byType[key] = byType[key] != null ? Math.min(byType[key], mult) : mult
          }
        })
      })
      return byType
    }

    const armorByType = collectModifiers(selectedArmorPieces.map(({ item }) => item?.armorDamageModifiers))
    const consumableByType = collectModifiers(
      selectedConsumables.map((prefab) => (prefab ? consumables.find((c) => c.prefab === prefab)?.damageModifiers : null))
    )

    // Consumables override armor entirely per damage type - not combined via Math.min.
    return { ...armorByType, ...consumableByType }
  }, [selectedArmorPieces, selectedConsumables, consumables, damageResistanceMap])

  useEffect(() => {
    onResistancesChange?.(combinedResistances)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedResistances])

  const handleChestChange = (prefab: string) => {
    setSelectedChest(prefab)
    setChestLevel(0)
  }

  const handleLegsChange = (prefab: string) => {
    setSelectedLegs(prefab)
    setLegsLevel(0)
  }

  const handleHelmetChange = (prefab: string) => {
    setSelectedHelmet(prefab)
    setHelmetLevel(0)
  }

  const handleShoulderChange = (prefab: string) => {
    setSelectedShoulder(prefab)
    setShoulderLevel(0)
  }

  // Update callback when selections change
  useEffect(() => {
    const chest = selectedChest
      ? armorItems.find((item) => item.prefab === selectedChest) || null
      : null
    const legs = selectedLegs
      ? armorItems.find((item) => item.prefab === selectedLegs) || null
      : null
    const helmet = selectedHelmet
      ? armorItems.find((item) => item.prefab === selectedHelmet) || null
      : null
    const shoulder = selectedShoulder
      ? armorItems.find((item) => item.prefab === selectedShoulder) || null
      : null

    onArmorChange?.({
      chest,
      legs,
      helmet,
      shoulder,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChest, selectedLegs, selectedHelmet, selectedShoulder])

  return (
    <div className="armor-selector">
      <h2>Select Armor</h2>
      <div className="armor-dropdowns">
        <div className="armor-dropdown-group">
          <label htmlFor="chest-select" className="armor-label">
            Chest:
          </label>
          <div className="armor-slot-row">
            <select
              id="chest-select"
              value={selectedChest}
              onChange={(e) => handleChestChange(e.target.value)}
              className="armor-dropdown"
            >
              <option value="">-- None --</option>
              {chestArmor
                .sort((a, b) => getArmorDisplayName(a).localeCompare(getArmorDisplayName(b)))
                .map((item) => (
                  <option key={item.prefab} value={item.prefab}>
                    {getArmorDisplayName(item)}
                  </option>
                ))}
            </select>
            {selectedChest && (
              <div className="armor-level-slider">
                <input
                  type="range"
                  min={0}
                  max={ARMOR_MAX_LEVEL}
                  value={chestLevel}
                  onChange={(e) => setChestLevel(Number(e.target.value))}
                  className="armor-level-input"
                />
                <span className="armor-level-label">+{chestLevel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="armor-dropdown-group">
          <label htmlFor="legs-select" className="armor-label">
            Legs:
          </label>
          <div className="armor-slot-row">
            <select
              id="legs-select"
              value={selectedLegs}
              onChange={(e) => handleLegsChange(e.target.value)}
              className="armor-dropdown"
            >
              <option value="">-- None --</option>
              {legsArmor
                .sort((a, b) => getArmorDisplayName(a).localeCompare(getArmorDisplayName(b)))
                .map((item) => (
                  <option key={item.prefab} value={item.prefab}>
                    {getArmorDisplayName(item)}
                  </option>
                ))}
            </select>
            {selectedLegs && (
              <div className="armor-level-slider">
                <input
                  type="range"
                  min={0}
                  max={ARMOR_MAX_LEVEL}
                  value={legsLevel}
                  onChange={(e) => setLegsLevel(Number(e.target.value))}
                  className="armor-level-input"
                />
                <span className="armor-level-label">+{legsLevel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="armor-dropdown-group">
          <label htmlFor="helmet-select" className="armor-label">
            Helmet:
          </label>
          <div className="armor-slot-row">
            <select
              id="helmet-select"
              value={selectedHelmet}
              onChange={(e) => handleHelmetChange(e.target.value)}
              className="armor-dropdown"
            >
              <option value="">-- None --</option>
              {helmetArmor
                .sort((a, b) => getArmorDisplayName(a).localeCompare(getArmorDisplayName(b)))
                .map((item) => (
                  <option key={item.prefab} value={item.prefab}>
                    {getArmorDisplayName(item)}
                  </option>
                ))}
            </select>
            {selectedHelmet && (
              <div className="armor-level-slider">
                <input
                  type="range"
                  min={0}
                  max={ARMOR_MAX_LEVEL}
                  value={helmetLevel}
                  onChange={(e) => setHelmetLevel(Number(e.target.value))}
                  className="armor-level-input"
                />
                <span className="armor-level-label">+{helmetLevel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="armor-dropdown-group">
          <label htmlFor="shoulder-select" className="armor-label">
            Shoulder:
          </label>
          <div className="armor-slot-row">
            <select
              id="shoulder-select"
              value={selectedShoulder}
              onChange={(e) => handleShoulderChange(e.target.value)}
              className="armor-dropdown"
            >
              <option value="">-- None --</option>
              {shoulderArmor
                .sort((a, b) => getArmorDisplayName(a).localeCompare(getArmorDisplayName(b)))
                .map((item) => (
                  <option key={item.prefab} value={item.prefab}>
                    {getArmorDisplayName(item)}
                  </option>
                ))}
            </select>
            {selectedShoulder && (
              <div className="armor-level-slider">
                <input
                  type="range"
                  min={0}
                  max={ARMOR_MAX_LEVEL}
                  value={shoulderLevel}
                  onChange={(e) => setShoulderLevel(Number(e.target.value))}
                  className="armor-level-input"
                />
                <span className="armor-level-label">+{shoulderLevel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="armor-total">Total Armor: {totalArmor}</p>
      <label className="bonemass-toggle">
        <input
          type="checkbox"
          checked={bonemassEnabled}
          onChange={(e) => setBonemassEnabled(e.target.checked)}
          className="bonemass-checkbox"
        />
        <span className="bonemass-label">Bonemass Enabled</span>
      </label>
      {bonemassEnabled && (
        <p className="bonemass-note">Resistant to all physical damage (blunt, slash, pierce)</p>
      )}
      <div className="consumable-dropdown-group">
        <div className="consumable-header">
          <label htmlFor="consumable-select-0" className="armor-label">
            Consumables
          </label>
          <button
            type="button"
            className="consumable-add-btn"
            onClick={() => setSelectedConsumables((prev) => [...prev, ''])}
            aria-label="Add consumable"
          >
            +
          </button>
        </div>
        {selectedConsumables.map((prefab, index) => (
          <div key={index} className="consumable-row">
            <select
              id={index === 0 ? 'consumable-select-0' : undefined}
              value={prefab}
              onChange={(e) => {
                const next = [...selectedConsumables]
                next[index] = e.target.value
                setSelectedConsumables(next)
              }}
              className="armor-dropdown consumable-select"
            >
              <option value="">-- None --</option>
              {consumables
                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                .map((item) => (
                  <option key={item.prefab} value={item.prefab}>
                    {item.displayName}
                  </option>
                ))}
            </select>
            {selectedConsumables.length > 1 && (
              <button
                type="button"
                className="consumable-remove-btn"
                onClick={() => setSelectedConsumables((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Remove consumable"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {selectedConsumables.some((p) => p) && (() => {
        const selectedWithMods = selectedConsumables
          .filter((p) => p)
          .map((prefab) => consumables.find((c) => c.prefab === prefab))
          .filter((c): c is Consumable => c != null && c.damageModifiers && Object.keys(c.damageModifiers).length > 0)
        if (selectedWithMods.length === 0) return null
        return (
          <div className="armor-resistances">
            <h3 className="armor-resistances-title">Consumable Damage Resistances</h3>
            {selectedWithMods.map((consumable) => {
              const mods = consumable.damageModifiers
              if (!mods || Object.keys(mods).length === 0) return null
              return (
                <div key={consumable.prefab} className="armor-resistance-piece">
                  <span className="armor-resistance-slot">{consumable.displayName}:</span>
                  <div className="armor-resistance-list">
                    {Object.entries(mods).map(([dmgType, level]) => {
                      const val = getResistanceValue(level)
                      return (
                        <span key={dmgType} className="armor-resistance-badge">
                          {dmgType}: {level}
                          {val != null && ` (${val}x)`}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
      {selectedArmorPieces.some((p) => p.item?.armorDamageModifiers && Object.keys(p.item.armorDamageModifiers).length > 0) && (
        <div className="armor-resistances">
          <h3 className="armor-resistances-title">Damage Resistances</h3>
          {selectedArmorPieces.map(({ slot, item }) => {
            const mods = item?.armorDamageModifiers
            if (!mods || Object.keys(mods).length === 0) return null
            return (
              <div key={slot} className="armor-resistance-piece">
                <span className="armor-resistance-slot">{getArmorDisplayName(item!)}:</span>
                <div className="armor-resistance-list">
                  {Object.entries(mods).map(([dmgType, level]) => {
                    const val = getResistanceValue(level)
                    return (
                      <span key={dmgType} className="armor-resistance-badge">
                        {dmgType}: {level}
                        {val != null && ` (${val}x)`}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {Object.keys(combinedResistances).length > 0 && (
        <div className="armor-resistances">
          <h3 className="armor-resistances-title">Effective Damage Resistances</h3>
          <p className="armor-resistances-note">
            A consumable's resistance to a damage type completely overrides any armor modifier for that same type
            (not just "best wins") — for example, a Fire Resistance mead negates a Weak-to-fire armor modifier entirely.
          </p>
          <div className="armor-resistance-list">
            {Object.entries(combinedResistances)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dmgType, mult]) => (
                <span
                  key={dmgType}
                  className={`armor-resistance-badge effective ${mult < 1 ? 'good' : mult > 1 ? 'bad' : ''}`}
                >
                  {dmgType}: {mult}x
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ArmorSelector

