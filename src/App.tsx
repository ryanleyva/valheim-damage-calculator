import { useState } from 'react'
import './App.css'
import CombatSettings from './components/CombatSettings'
import HealthBar from './components/HealthBar'
import EnemySelector from './components/EnemySelector'
import ArmorSelector from './components/ArmorSelector'

function App() {
  const [activeTab, setActiveTab] = useState<'Damage' | 'Parry'>('Damage')
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

  return (
    <>
      <header>
        <h1>Valheim Damage and Parry Calc</h1>
      </header>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'Damage' ? 'active' : ''}`}
          onClick={() => setActiveTab('Damage')}
        >
          Damage
        </button>
        <button
          className={`tab ${activeTab === 'Parry' ? 'active' : ''}`}
          onClick={() => setActiveTab('Parry')}
        >
          Parry
        </button>
      </div>
      <main className="tab-content">
        {activeTab === 'Damage' && (
          <div>
            <CombatSettings onMultiplierChange={handleMultiplierChange} />
            <ArmorSelector
              onTotalArmorChange={setTotalArmor}
              onResistancesChange={setResistances}
              onBonemassChange={setBonemassEnabled}
            />
            <HealthBar onHealthChange={handleHealthChange} />
            <EnemySelector
              combatMultiplier={combatMultiplier}
              totalArmor={totalArmor}
              resistances={resistances}
              bonemassEnabled={bonemassEnabled}
              playerHealth={playerHealth}
            />
          </div>
        )}
        {activeTab === 'Parry' && (
          <div className="construction-placeholder">
            <h2>Under Construction</h2>
            <p>The Parry Calculator is coming soon!</p>
          </div>
        )}
      </main>
    </>
  )
}

export default App
