import { useState, useEffect, useMemo } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'

interface Enemy {
  prefab: string
  displayName: string
  faction: string
  damageModifiers: Record<string, string>
  attacks: Array<{
    prefab: string
    displayName: string
    itemType: string
    damages: Record<string, number>
    damagesPerLevel: Record<string, number>
    attackForce: number
  }>
}

const PHYSICAL_DAMAGE_TYPES = ['blunt', 'slash', 'pierce']
const BONEMASS_RESISTANCE = 0.75

interface EnemySelectorProps {
  onEnemyChange?: (enemy: Enemy | null) => void
  combatMultiplier?: number
  onStarMultiplierChange?: (multiplier: number) => void
  totalArmor?: number
  resistances?: Record<string, number>
  bonemassEnabled?: boolean
  playerHealth?: number
  parryThreshold?: number
  canParry?: boolean
}

interface AttackRename {
  oldName: string
  newName: string
  ignore?: boolean
}

// Calculate health lost from damage: if armor < damage/2 then damage - armor, else damage²/(armor*4)
function calcHealthLost(damage: number, armor: number): number {
  if (armor < damage / 2) {
    return Math.max(0, damage - armor)
  }
  return (damage * damage) / (armor * 4)
}

// Apply resistance multiplier (resistances don't stack - use best). Bonemass adds 0.5x to physical damage.
function applyResistance(
  rawDamage: number,
  damageType: string,
  resistances: Record<string, number>,
  bonemassEnabled: boolean
): number {
  const key = damageType.toLowerCase()
  let mult = resistances[key] ?? 1
  if (bonemassEnabled && PHYSICAL_DAMAGE_TYPES.includes(key)) {
    mult = Math.min(mult, BONEMASS_RESISTANCE)
  }
  return rawDamage * mult
}

function EnemySelector({ onEnemyChange, combatMultiplier = 1, onStarMultiplierChange, totalArmor = 0, resistances = {}, bonemassEnabled = false, playerHealth = 100, parryThreshold = 0, canParry = false }: EnemySelectorProps) {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedEnemy, setSelectedEnemy] = usePersistentState<string>('selectedEnemy', '')
  const [starRating, setStarRating] = usePersistentState<number>('starRating', 0) // 0, 1, or 2 stars
  const [selectedAttackIndex, setSelectedAttackIndex] = useState<number | null>(null)
  const [attackRenameMap, setAttackRenameMap] = useState<Record<string, string>>({})
  const [enemyRenameMap, setEnemyRenameMap] = useState<Record<string, string>>({})
  const [ignoredEnemyPrefabs, setIgnoredEnemyPrefabs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/data/attack_rename.json')
      .then((res) => res.json())
      .then((list: AttackRename[]) => {
        const map: Record<string, string> = {}
        list.forEach(({ oldName, newName }) => {
          map[oldName] = newName
          map[oldName.toLowerCase()] = newName
        })
        setAttackRenameMap(map)
      })
      .catch((err) => console.error('Error loading attack renames:', err))
  }, [])

  useEffect(() => {
    fetch('/data/enemy_rename.json')
      .then((res) => res.json())
      .then((list: AttackRename[]) => {
        const map: Record<string, string> = {}
        list.forEach(({ oldName, newName }) => {
          map[oldName] = newName
          map[oldName.toLowerCase()] = newName
        })
        setEnemyRenameMap(map)
        setIgnoredEnemyPrefabs(
          new Set(list.filter((entry) => entry.ignore).map((entry) => entry.oldName.toLowerCase()))
        )
      })
      .catch((err) => console.error('Error loading enemy renames:', err))
  }, [])

  useEffect(() => {
    fetch('/data/enemies_20260207_153953.json')
      .then((response) => response.json())
      .then((raw: { data?: Enemy[] } | Enemy[]) => {
        // Support both root array and { data: [...] } shape
        const data: Enemy[] = Array.isArray(raw)
          ? raw
          : (raw?.data ?? [])

        if (!Array.isArray(data)) {
          setEnemies([])
          return
        }

        // Normalize attacks: some files use name/damage, we expect prefab/damages
        const normalized = data.map((enemy) => ({
          ...enemy,
          attacks: (enemy.attacks ?? []).map((a: { prefab?: string; name?: string; damages?: Record<string, number>; damage?: Record<string, number>; damagesPerLevel?: Record<string, number>; damagePerLevel?: Record<string, number>; attackForce?: number }) => ({
            prefab: a.prefab ?? a.name ?? '',
            displayName: (a as { displayName?: string }).displayName ?? (a.name ?? a.prefab ?? ''),
            itemType: (a as { itemType?: string }).itemType ?? 'OneHandedWeapon',
            damages: a.damages ?? a.damage ?? {},
            damagesPerLevel: (a as { damagesPerLevel?: Record<string, number> }).damagesPerLevel ?? a.damagePerLevel ?? {},
            attackForce: a.attackForce ?? 0,
          })),
        }))

        // Remove duplicate enemies by prefab (keep first occurrence, case-insensitive)
        const seenEnemyPrefabs = new Set<string>()
        const uniqueEnemies = normalized.filter((enemy) => {
          const key = enemy.prefab?.toLowerCase() ?? ''
          if (!key || seenEnemyPrefabs.has(key)) {
            return false
          }
          seenEnemyPrefabs.add(key)
          return true
        })

        // Remove duplicate attacks from each enemy (keep first occurrence per attack prefab/name, case-insensitive)
        const enemiesWithUniqueAttacks = uniqueEnemies.map((enemy) => {
          const seenAttackKeys = new Set<string>()
          const uniqueAttacks = enemy.attacks.filter((attack) => {
            const key = (attack.prefab ?? '').toLowerCase()
            if (!key || seenAttackKeys.has(key)) {
              return false
            }
            seenAttackKeys.add(key)
            return true
          })
          return { ...enemy, attacks: uniqueAttacks }
        })

        // Filter out enemies with no attacks
        const enemiesWithAttacks = enemiesWithUniqueAttacks.filter(
          (enemy) => enemy.attacks.length > 0
        )

        setEnemies(enemiesWithAttacks)
      })
      .catch((error) => {
        console.error('Error loading enemies:', error)
      })
  }, [])

  // Group enemies by faction, skipping any prefab flagged "ignore" in enemy_rename.json
  const enemiesByFaction = useMemo(() => {
    const grouped: Record<string, Enemy[]> = {}
    enemies.forEach((enemy) => {
      if (ignoredEnemyPrefabs.has(enemy.prefab.toLowerCase())) {
        return
      }
      if (!grouped[enemy.faction]) {
        grouped[enemy.faction] = []
      }
      grouped[enemy.faction].push(enemy)
    })
    return grouped
  }, [enemies, ignoredEnemyPrefabs])

  // Display name for enemy: use enemy_rename.json if present, else displayName or prefab
  const getEnemyDisplayName = (enemy: Enemy) => {
    const key = enemy.prefab
    const renamed = enemyRenameMap[key] ?? enemyRenameMap[key.toLowerCase()]
    if (renamed) return renamed
    return enemy.displayName?.trim() || enemy.prefab
  }

  // Filter enemies by search term (matches both prefab and renamed name)
  const filteredEnemiesByFaction = useMemo(() => {
    if (!searchTerm.trim()) {
      return enemiesByFaction
    }

    const term = searchTerm.toLowerCase()
    const filtered: Record<string, Enemy[]> = {}
    Object.keys(enemiesByFaction).forEach((faction) => {
      const matchingEnemies = enemiesByFaction[faction].filter((enemy) => {
        const displayName = getEnemyDisplayName(enemy)
        return (
          enemy.prefab.toLowerCase().includes(term) ||
          displayName.toLowerCase().includes(term)
        )
      })
      if (matchingEnemies.length > 0) {
        filtered[faction] = matchingEnemies
      }
    })
    return filtered
  }, [enemiesByFaction, searchTerm, enemyRenameMap])

  const handleEnemySelect = (prefab: string) => {
    setSelectedEnemy(prefab)
    setSelectedAttackIndex(null)
    const enemy = enemies.find((e) => e.prefab === prefab)
    onEnemyChange?.(enemy || null)
  }

  const sortedFactions = Object.keys(filteredEnemiesByFaction).sort()
  const currentEnemy = enemies.find((e) => e.prefab === selectedEnemy)

  // Star multipliers: 0 stars = 1x, 1 star = 1.5x, 2 stars = 2x
  const starMultiplier = starRating === 0 ? 1 : starRating === 1 ? 1.5 : 2

  useEffect(() => {
    onStarMultiplierChange?.(starMultiplier)
  }, [starRating, starMultiplier, onStarMultiplierChange])

  const handleStarClick = (stars: number) => {
    setStarRating(stars)
  }

  // Get damage types with non-zero values for an attack (excluding chop and pickaxe)
  // Multiply by combat difficulty multiplier and star multiplier
  const getDamageTypes = (damages: Record<string, number>) => {
    return Object.entries(damages)
      .filter(([type, value]) => value > 0 && type !== 'chop' && type !== 'pickaxe')
      .map(([type, value]) => ({ 
        type, 
        value: Math.round(value * combatMultiplier * starMultiplier * 100) / 100 // Round to 2 decimal places
      }))
  }

  // Format prefab name: convert underscores to spaces and capitalize first letter of each word
  const formatPrefabName = (prefab: string) => {
    return prefab
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // An attack is parryable if its total raw incoming damage is at or below the parry
  // threshold ((block power * parry bonus) + (max health * 0.4)), computed from the
  // equipped shield (or weapon, if no shield) in App. No shield/weapon (or a 0
  // parry-bonus shield, e.g. tower shields) means nothing is parryable.
  const isParryable = (totalRawDamage: number): boolean => {
    return canParry && totalRawDamage <= parryThreshold
  }

  // Display attack name: use attack_rename.json if present, else formatted prefab
  const getAttackDisplayName = (attack: { prefab: string }) => {
    const key = attack.prefab
    const renamed = attackRenameMap[key] ?? attackRenameMap[key.toLowerCase()]
    if (renamed) return renamed
    return formatPrefabName(attack.prefab)
  }

  return (
    <div className="enemy-selector">
      <div className="enemy-selector-header">
        <h2>Select Enemy</h2>
        <div className="star-rating">
          <button
            className={`star-button ${starRating >= 1 ? 'active' : ''}`}
            onClick={() => handleStarClick(starRating === 1 ? 0 : 1)}
            aria-label="1 star"
          >
            ★
          </button>
          <button
            className={`star-button ${starRating >= 2 ? 'active' : ''}`}
            onClick={() => handleStarClick(starRating === 2 ? 1 : 2)}
            aria-label="2 stars"
          >
            ★
          </button>
        </div>
      </div>
      <div className="enemy-search">
        <input
          type="text"
          placeholder="Search by enemy name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="enemy-search-input"
        />
      </div>
      <select
        value={selectedEnemy}
        onChange={(e) => handleEnemySelect(e.target.value)}
        className="enemy-dropdown"
      >
        <option value="">-- Select an enemy --</option>
        {sortedFactions.map((faction) => (
          <optgroup key={faction} label={faction}>
            {filteredEnemiesByFaction[faction]
              .sort((a, b) => getEnemyDisplayName(a).localeCompare(getEnemyDisplayName(b)))
              .map((enemy) => (
                <option key={enemy.prefab} value={enemy.prefab}>
                  {getEnemyDisplayName(enemy)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {currentEnemy && currentEnemy.attacks.length > 0 && (
        <div className="enemy-attacks">
          <h3>Attacks</h3>
          <p className="parry-threshold-note">
            {canParry
              ? `Parry Threshold: ${Math.round(parryThreshold * 100) / 100} (raw incoming damage at or below this can be parried)`
              : 'Select a shield or weapon to see which attacks are parryable'}
          </p>
          {currentEnemy.attacks.map((attack, index) => {
            const damageTypes = getDamageTypes(attack.damages)
            const totalRawDamage = damageTypes.reduce((sum, { value }) => sum + value, 0)
            const attackIsParryable = isParryable(totalRawDamage)
            const isSelected = selectedAttackIndex === index
            return (
              <div
                key={attack.prefab || index}
                className={`attack-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedAttackIndex(isSelected ? null : index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && (isSelected ? setSelectedAttackIndex(null) : setSelectedAttackIndex(index))}
              >
                <div className="attack-name-row">
                  <h4 className="attack-name">{getAttackDisplayName(attack)}</h4>
                  <span className={`parry-badge ${attackIsParryable ? 'parryable' : 'not-parryable'}`}>
                    {attackIsParryable ? 'Parryable' : 'Not Parryable'}
                  </span>
                </div>
                {damageTypes.length > 0 ? (
                  <div className="damage-types">
                    {damageTypes.map(({ type, value }) => (
                      <span key={type} className="damage-badge">
                        {type}: {value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="no-damage">No damage</p>
                )}
                {isSelected && damageTypes.length > 0 && (
                  <div className="health-lost-section">
                    <h4 className="health-lost-title">Damage to player</h4>
                    <div className="health-lost-types">
                      {damageTypes.map(({ type, value }) => {
                        const effectiveDamage = applyResistance(value, type, resistances, bonemassEnabled)
                        const healthLost = calcHealthLost(effectiveDamage, totalArmor)
                        return (
                          <span key={type} className="health-lost-badge">
                            {type}: {Math.round(healthLost * 100) / 100}
                          </span>
                        )
                      })}
                    </div>
                    <p className="health-lost-total">
                      Total:{' '}
                      {Math.round(
                        damageTypes.reduce(
                          (sum, { type, value }) =>
                            sum + calcHealthLost(applyResistance(value, type, resistances, bonemassEnabled), totalArmor),
                          0
                        ) * 100
                      ) / 100}
                    </p>
                    {(() => {
                      const totalPerHit = damageTypes.reduce(
                        (sum, { type, value }) =>
                          sum + calcHealthLost(applyResistance(value, type, resistances, bonemassEnabled), totalArmor),
                        0
                      )
                      const hitsToKill =
                        totalPerHit > 0 ? Math.ceil(playerHealth / totalPerHit) : null
                      return (
                        <p className="hits-to-kill">
                          Hits before death: {hitsToKill != null ? hitsToKill : '∞'}
                        </p>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EnemySelector

