import { useState, useMemo } from 'react'
import './App.css'
import CombatSettings from './components/CombatSettings'
import HealthBar from './components/HealthBar'
import EnemySelector from './components/EnemySelector'
import ArmorSelector from './components/ArmorSelector'
import ShieldSelector, { type SelectedShield } from './components/ShieldSelector'
import WeaponSelector, { type SelectedWeapon } from './components/WeaponSelector'

// Parry threshold: an attack is parryable if its attack force is at or below
// (block power * parry bonus) + (max health * 0.4). Shield takes priority over weapon;
// a shield/weapon with 0 parry bonus (e.g. tower shields) can't parry at all.
const PARRY_HEALTH_FACTOR = 0.4

function App() {
  const [selectedShield, setSelectedShield] = useState<SelectedShield | null>(null)
  const [selectedWeapon, setSelectedWeapon] = useState<SelectedWeapon | null>(null)
  // Store player stats for damage calculations
  const [playerHealth, setPlayerHealth] = useState<number>(100)
  const [combatMultiplier, setCombatMultiplier] = useState<number>(1)
  // Bonemass power: resistant to physical damage (blunt, slash, pierce)
  const [bonemassEnabled, setBonemassEnabled] = useState<boolean>(false)
  const [totalArmor, setTotalArmor] = useState<number>(0)
  const [resistances, setResistances] = useState<Record<string, number>>({})

  const handleMultiplierChange = (multiplier: number) => {
    setCombatMultiplier(multiplier)
  }

  const handleHealthChange = (health: number) => {
    setPlayerHealth(health)
  }

  // Shield takes priority over weapon for parry stats
  const parryGear = selectedShield
    ? { blockPower: selectedShield.blockPower, parryBonus: selectedShield.item.parryBonus }
    : selectedWeapon
      ? { blockPower: selectedWeapon.blockPower, parryBonus: selectedWeapon.item.parryBonus }
      : null

  const canParry = (parryGear?.parryBonus ?? 0) > 0

  const parryThreshold = useMemo(() => {
    const blockContribution = parryGear ? parryGear.blockPower * parryGear.parryBonus : 0
    return blockContribution + playerHealth * PARRY_HEALTH_FACTOR
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parryGear?.blockPower, parryGear?.parryBonus, playerHealth])

  return (
    <>
      <header>
        <h1>Valheim Damage and Parry Calc</h1>
      </header>
      <main className="tab-content">
        <div>
          <CombatSettings onMultiplierChange={handleMultiplierChange} />
          <ArmorSelector
            onTotalArmorChange={setTotalArmor}
            onResistancesChange={setResistances}
            onBonemassChange={setBonemassEnabled}
          />
          <ShieldSelector onShieldChange={setSelectedShield} />
          <WeaponSelector onWeaponChange={setSelectedWeapon} />
          <HealthBar onHealthChange={handleHealthChange} />
          <EnemySelector
            combatMultiplier={combatMultiplier}
            totalArmor={totalArmor}
            resistances={resistances}
            bonemassEnabled={bonemassEnabled}
            playerHealth={playerHealth}
            parryThreshold={parryThreshold}
            canParry={canParry}
          />
        </div>
      </main>
    </>
  )
}

export default App
