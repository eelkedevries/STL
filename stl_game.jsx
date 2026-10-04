import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Icon, IconButton, Label, Meter, PrimaryButton, SecondaryButton, Sheet, ShipSilhouette, Tile } from './src/ui.jsx'

const MASTER = {
  orbitCount: 5,
  slotCounts: [4, 8, 16, 32, 64],
  maxSystems: 10,
  saveKey: 'stl_canvas_synth_v16',
  setupKey: 'stl_canvas_setup_v1',
  orbitTurnMs: 6000,
}

const DEFAULT_ORBIT_SPEEDS = [3, 3, 2, 2, 1]
const REVERSED_ORBIT_CHANCE = 0.35
const MIN_ORBIT_SPEED_DIFFERENCE = 0.2
const MISSILE_CARGO_STACK = 4
const CREW_LEVEL_THRESHOLDS = [0, 18, 40, 68, 102, 142]
const HEX_ARENA = { cols: 9, rows: 5, size: 26 }
const DRONE_SQUADRON_SIZE = 6
const DRONE_ACTIVE_LIMIT = 1
const DRONE_REGEN_INTERVAL = 2
const SYSTEM_TYPES = ['Civilised', 'Pirate', 'Industrial', 'Frontier', 'Research', 'Militarised', 'AI Controlled']
const NAME_A = ['Vesper', 'Hollow', 'Ash', 'Crown', 'Aster', 'Morrow', 'Lattice', 'Sable', 'Helix', 'Nadir', 'Oris', 'Kestrel']
const NAME_B = ['Reach', 'Spindle', 'Drift', 'Veil', 'Array', 'Fold', 'March', 'Chorus', 'Node', 'Belt', 'Harbour', 'Melt']
const CREW_M = ['Aren', 'Kade', 'Iven', 'Rho', 'Salen', 'Marik', 'Tovan', 'Hale']
const CREW_F = ['Lysa', 'Edda', 'Tarin', 'Veya', 'Mira', 'Sel', 'Nema', 'Cira']
const CREW_TRAITS = ['steady under pressure', 'keen-eyed', 'resourceful', 'quietly stubborn', 'disciplined', 'good with strangers', 'obsessed with salvage', 'restless and curious']
const WANTED_REASONS = ['contraband running', 'police assault', 'restricted relay intrusion', 'pirate collaboration', 'fraudulent transponder use']

const KIND_META = {
  empty: { label: 'Empty waypoint', colour: '#94a3b8', symbol: '·' },
  base_arrival: { label: 'Cardinal arrival station', colour: '#f59e0b', symbol: '⬢' },
  base_departure: { label: 'Cardinal space station', colour: '#22c55e', symbol: '⬢' },
  planet: { label: 'Planet', colour: '#60a5fa', symbol: '●' },
  belt: { label: 'Asteroid belt', colour: '#a78bfa', symbol: '◆' },
  merchant: { label: 'Merchant', colour: '#fbbf24', symbol: '◆' },
  pirate: { label: 'Pirate group', colour: '#ef4444', symbol: '▲' },
  patrol: { label: 'Police patrol', colour: '#fb7185', symbol: '▲' },
  distress: { label: 'Distress signal', colour: '#fde047', symbol: '✚' },
  hazard: { label: 'Hazard', colour: '#f97316', symbol: '■' },
  wreck: { label: 'Wreck', colour: '#94a3b8', symbol: '■' },
  anomaly: { label: 'Anomaly', colour: '#c084fc', symbol: '✦' },
  station: { label: 'Station', colour: '#14b8a6', symbol: '⬢' },
  relay: { label: 'Relay', colour: '#38bdf8', symbol: '◫' },
  convoy: { label: 'Convoy', colour: '#2dd4bf', symbol: '▣' },
  survey: { label: 'Survey team', colour: '#a3e635', symbol: '◌' },
  depot: { label: 'Supply depot', colour: '#fca5a5', symbol: '▥' },
  shipyard: { label: 'Ship construction station', colour: '#34d399', symbol: '▤' },
  spent: { label: 'Spent contact', colour: '#64748b', symbol: '·' },
  player: { label: 'Player ship', colour: '#ffffff', symbol: '✦' },
}

const CONTACT_SHIP_META = {
  merchant: { label: 'Merchant ship', colour: '#fbbf24', symbol: '◆', accent: 'amber', enemyKind: 'merchant' },
  pirate: { label: 'Pirate ship', colour: '#ef4444', symbol: '▲', accent: 'rose', enemyKind: 'pirate' },
  patrol: { label: 'Police ship', colour: '#fb7185', symbol: '⬟', accent: 'rose', enemyKind: 'patrol' },
  civilian: { label: 'Civilian ship', colour: '#67e8f9', symbol: '◇', accent: 'cyan', enemyKind: 'civilian' },
}

const CONTACT_DENSITY = [0.22, 0.28, 0.34, 0.42, 0.5]
const INNER_CONTACT_POOL = ['merchant', 'station', 'distress', 'hazard', 'wreck', 'anomaly', 'relay', 'convoy', 'survey', 'depot', 'merchant', 'station', 'survey', 'relay']
const OUTER_CONTACT_POOL = [...INNER_CONTACT_POOL, 'pirate', 'pirate', 'patrol', 'hazard', 'wreck', 'convoy', 'shipyard']
const SYSTEM_SECURITY = {
  Civilised: { police: 0.22, pirates: 0.1 },
  Pirate: { police: 0.05, pirates: 0.36 },
  Industrial: { police: 0.2, pirates: 0.14 },
  Frontier: { police: 0.12, pirates: 0.25 },
  Research: { police: 0.18, pirates: 0.12 },
  Militarised: { police: 0.3, pirates: 0.08 },
  'AI Controlled': { police: 0.38, pirates: 0.05 },
}
const CONTENT_COPY = {
  empty: {
    description: 'No ship, station, anomaly, or hazard currently occupies this waypoint.',
    opportunity: 'Useful as a transit anchor while planning around the moving orbits.',
    danger: 'The route is quiet for now, but the orbit will still advance when the turn resolves.',
  },
  planet: {
    description: 'A major local body used for navigation, traffic orientation, and occasional commerce.',
    opportunity: 'Possible resupply, survey work, and route landmarks.',
    danger: 'Routine traffic and gravitational clutter can complicate an approach.',
  },
  belt: {
    description: 'A structured asteroid belt spread across ordinary waypoint segments in this orbit.',
    opportunity: 'Contains mineable resources if a mining laser is equipped.',
    danger: 'Debris strikes and pirate ambushes are common.',
  },
  merchant: {
    description: 'A roving trader with scarce but useful goods.',
    opportunity: 'Trade scrap for parts and ammunition.',
    danger: 'Prices are rarely favourable for desperate ships.',
  },
  pirate: {
    description: 'An armed hostile group shadowing traffic through the lane.',
    opportunity: 'Salvage is available if the raiders are defeated.',
    danger: 'Combat is likely on approach.',
  },
  patrol: {
    description: 'A police patrol screening cargo routes and transponder traffic.',
    opportunity: 'Their presence can suppress raiders in nearby lanes.',
    danger: 'They can detect, inspect, and punish suspicious ships.',
  },
  distress: {
    description: 'A weak emergency beacon with intermittent voice bursts.',
    opportunity: 'Possible rescue, crew recovery, or abandoned supplies.',
    danger: 'It could be a trap or a failing beacon in a hazardous lane.',
  },
  hazard: {
    description: 'Debris, radiation, plasma shear, or another navigational hazard blocks this segment.',
    opportunity: 'Mostly just route knowledge for later planning.',
    danger: 'Crossing the waypoint can damage the hull.',
  },
  wreck: {
    description: 'A drifting wreck with salvageable metal and stripped compartments.',
    opportunity: 'Recoverable scrap and spare parts.',
    danger: 'The area may already have attracted scavengers.',
  },
  anomaly: {
    description: 'A local physical irregularity beyond standard navigation models.',
    opportunity: 'Strange effects can benefit shields or reveal new data.',
    danger: 'The same irregularity may damage the hull.',
  },
  station: {
    description: 'A minor station with limited services and a short-lived market.',
    opportunity: 'Better than being stranded in open traffic.',
    danger: 'Stock, crew, and repair capability are all inconsistent.',
  },
  relay: {
    description: 'A navigation relay rebroadcasting route data and transponder chatter.',
    opportunity: 'Useful chart updates and local traffic intelligence.',
    danger: 'Signal clutter can attract eavesdroppers and opportunists.',
  },
  convoy: {
    description: 'A civilian convoy inching through the lane under light escort.',
    opportunity: 'Rumours, barter, and safe movement cues.',
    danger: 'Congestion makes the lane attractive to raiders.',
  },
  survey: {
    description: 'A survey team mapping the orbit and tagging persistent route changes.',
    opportunity: 'Fresh observational data and low-value trade.',
    danger: 'Restricted operations leave little room for mistakes.',
  },
  depot: {
    description: 'A stripped-down supply depot anchored to the orbital lane.',
    opportunity: 'Emergency parts and fuel-cell salvage.',
    danger: 'Inventory is thin and maintenance is unreliable.',
  },
  shipyard: {
    description: 'A modular construction yard selling refitted hulls and workshop-grade upgrades.',
    opportunity: 'Buy a new ship or improve mounted equipment with proper industrial tooling.',
    danger: 'Refits are expensive, and you may need trade-in value or hard currency to afford them.',
  },
}

const SHIP_PRESETS = {
  Scout: { hullMax: 72, shieldsMax: 26, armour: 1, speed: 4, maneuverability: 4, stealth: 4, cargoCapacity: 32, fuelCapacity: 18, crewCapacity: 4, weaponSlots: 4, maxPower: 6, value: 170, loadout: ['Laser_I', 'Kinetic_I', 'Mining_Laser'] },
  Cargo: { hullMax: 90, shieldsMax: 18, armour: 2, speed: 2, maneuverability: 1, stealth: 2, cargoCapacity: 52, fuelCapacity: 24, crewCapacity: 6, weaponSlots: 4, maxPower: 7, value: 235, loadout: ['Laser_I', 'Mining_Laser', 'Missile_I'] },
  Battleship: { hullMax: 116, shieldsMax: 28, armour: 3, speed: 3, maneuverability: 2, stealth: 1, cargoCapacity: 24, fuelCapacity: 20, crewCapacity: 5, weaponSlots: 4, maxPower: 8, value: 315, loadout: ['Laser_I', 'Missile_I', 'Kinetic_I'] },
}

const WEAPONS = {
  Laser_I: { id: 'Laser_I', name: 'Pulse Laser I', damage: 6, accuracy: 0.82, shieldPen: 0.15, cooldown: 1.0, ammoType: null, hpMax: 16 },
  Missile_I: { id: 'Missile_I', name: 'Needle Missile I', damage: 14, accuracy: 0.72, shieldPen: 0.92, cooldown: 2.4, ammoType: 'missile', hpMax: 14, rackSize: 1 },
  Kinetic_I: { id: 'Kinetic_I', name: 'Kinetic Battery I', damage: 9, accuracy: 0.76, shieldPen: 0.4, cooldown: 1.6, ammoType: 'kinetic_ammo', hpMax: 18 },
  Mining_Laser: { id: 'Mining_Laser', name: 'Mining Laser', damage: 4, accuracy: 0.9, shieldPen: 0.05, cooldown: 1.2, ammoType: null, hpMax: 15 },
}

const EQUIPMENT_CATALOG = {
  Laser_I: { id: 'Laser_I', name: 'Pulse Laser I', kind: 'weapon', slotType: 'weapon', powerDraw: 2, icon: 'PL', colour: '#f87171', size: 1, price: 18, description: 'A compact pulse laser package ready for storage, trade, or later installation.' },
  Missile_I: { id: 'Missile_I', name: 'Needle Missile I', kind: 'weapon', slotType: 'weapon', powerDraw: 3, icon: 'MS', colour: '#fb923c', size: 1, price: 24, description: 'A missile rack and guidance package stored as a sealed weapons crate.' },
  Kinetic_I: { id: 'Kinetic_I', name: 'Kinetic Battery I', kind: 'weapon', slotType: 'weapon', powerDraw: 2, icon: 'KB', colour: '#cbd5e1', size: 1, price: 20, description: 'A dense kinetic battery assembly for close-quarters interception work.' },
  Mining_Laser: { id: 'Mining_Laser', name: 'Mining Laser', kind: 'utility', slotType: 'weapon', powerDraw: 1, icon: 'ML', colour: '#a78bfa', size: 1, price: 16, description: 'An industrial mining emitter. Valuable in asteroid belts and field salvage.' },
  Shield_Capacitor: { id: 'Shield_Capacitor', name: 'Shield Capacitor', kind: 'module', slotType: null, powerDraw: 0, icon: 'SC', colour: '#38bdf8', size: 1, price: 14, description: 'Auxiliary shield hardware packed for storage and later fitting.' },
  Armor_Plating: { id: 'Armor_Plating', name: 'Armor Plating', kind: 'module', slotType: null, powerDraw: 0, icon: 'AP', colour: '#94a3b8', size: 1, price: 15, description: 'Replacement hull plating and hardpoints for future reinforcement work.' },
  Survey_Drone: { id: 'Survey_Drone', name: 'Survey Drone', kind: 'utility', slotType: null, powerDraw: 0, icon: 'SD', colour: '#a3e635', size: 1, price: 12, description: 'A compact autonomous survey drone stored as a mission-ready crate.' },
  Fuel_Cask: { id: 'Fuel_Cask', name: 'Fuel Cask', kind: 'module', slotType: null, powerDraw: 0, icon: 'FC', colour: '#67e8f9', size: 1, price: 13, description: 'A sealed reserve fuel cask. Useful trade cargo in systems where refuelling is expensive or scarce.' },
  Missile_Ammo: { id: 'Missile_Ammo', name: 'Missile crate', kind: 'ammo', slotType: null, powerDraw: 0, icon: 'AM', colour: '#fb923c', size: 1, price: 20, description: 'Crated missiles for launcher reloads. Higher-grade missiles hit harder.' },
}

const STARTING_CARGO = {
  Scout: ['Shield_Capacitor', 'Survey_Drone'],
  Cargo: ['Armor_Plating', 'Fuel_Cask', 'Mining_Laser'],
  Battleship: ['Shield_Capacitor', 'Armor_Plating'],
}

const SHIP_NAME_DEFAULTS = {
  Scout: 'Wayfarer',
  Cargo: 'Mule',
  Battleship: 'Aegis',
}
const DEFAULT_PLAYER_NAME = 'Astra'

const MERCHANT_STOCK_POOL = ['Laser_I', 'Missile_I', 'Kinetic_I', 'Mining_Laser', 'Shield_Capacitor', 'Armor_Plating', 'Survey_Drone', 'Fuel_Cask', 'Missile_Ammo']

const ENEMIES = {
  pirate: { name: 'Raider Flotilla', hullMax: 48, shieldsMax: 12, armour: 1, speed: 3, maneuverability: 2, stealth: 2, loadout: ['Laser_I', 'Kinetic_I'], reward: { scrap: 14, parts: 6 } },
  patrol: { name: 'Police Interceptor', hullMax: 56, shieldsMax: 18, armour: 2, speed: 4, maneuverability: 3, stealth: 1, loadout: ['Laser_I', 'Laser_I'], reward: { scrap: 10, parts: 8 } },
  merchant: { name: 'Merchant Escort', hullMax: 52, shieldsMax: 14, armour: 1, speed: 3, maneuverability: 2, stealth: 2, loadout: ['Laser_I'], reward: { scrap: 8, parts: 4 } },
  civilian: { name: 'Civilian Courier', hullMax: 40, shieldsMax: 10, armour: 1, speed: 3, maneuverability: 3, stealth: 3, loadout: ['Laser_I'], reward: { scrap: 6, parts: 2 } },
}

const COMBAT_TARGETS = [
  { id: 'hull', label: 'Hull' },
  { id: 'weapons', label: 'Weapon system' },
  { id: 'shields', label: 'Shields' },
  { id: 'engines', label: 'Engines' },
  { id: 'crew', label: 'Crew' },
]

const CREW_SKILL_DEFS = {
  weapon_specialist: {
    label: 'Weapon specialist',
    perks: [
      { id: 'rate_of_fire', label: 'Rate of fire' },
      { id: 'damage', label: 'Damage output' },
      { id: 'combat_repairs', label: 'Combat repairs' },
    ],
  },
  pilot: {
    label: 'Pilot',
    perks: [
      { id: 'dodge', label: 'Dodge' },
      { id: 'speed', label: 'Speed' },
      { id: 'stealth', label: 'Stealth' },
    ],
  },
  repair_specialist: {
    label: 'Repair specialist',
    perks: [
      { id: 'repair_speed', label: 'Repair speed' },
      { id: 'multitasking', label: 'Multitasking' },
      { id: 'restoration', label: 'Restoration' },
    ],
  },
  scrapper: {
    label: 'Scrapper',
    perks: [
      { id: 'enemy_salvage', label: 'Enemy salvage' },
      { id: 'event_salvage', label: 'Event salvage' },
      { id: 'mining_yield', label: 'Mining yield' },
    ],
  },
}

const CREW_SKILL_IDS = Object.keys(CREW_SKILL_DEFS)
const ROLE_DEFAULT_SKILLS = {
  pilot: 'pilot',
  repair: 'repair_specialist',
  diplomat: 'pilot',
  salvager: 'scrapper',
  hacker: 'weapon_specialist',
  dependent: null,
}

const LEGEND_ITEMS = [
  { kind: 'player', name: 'Player ship' },
  { kind: 'empty', name: 'Empty waypoint' },
  { kind: 'base_arrival', name: 'Arrival station' },
  { kind: 'planet', name: 'Planet' },
  { kind: 'belt', name: 'Asteroid belt' },
  { kind: 'base_departure', name: 'Cardinal space station' },
  { kind: 'merchant', name: 'Merchant' },
  { kind: 'pirate', name: 'Pirate group' },
  { kind: 'patrol', name: 'Police patrol' },
  { kind: 'distress', name: 'Distress signal' },
  { kind: 'hazard', name: 'Hazard' },
  { kind: 'wreck', name: 'Wreck' },
  { kind: 'anomaly', name: 'Anomaly' },
  { kind: 'relay', name: 'Relay' },
  { kind: 'convoy', name: 'Convoy' },
  { kind: 'survey', name: 'Survey team' },
  { kind: 'depot', name: 'Supply depot' },
  { kind: 'shipyard', name: 'Ship construction station' },
]

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }
function wrap(value, mod) { return ((value % mod) + mod) % mod }
function deepClone(value) { return JSON.parse(JSON.stringify(value)) }
function createId(prefix = 'id') {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function sanitizeName(value, fallback, maxLength = 24) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, maxLength) : fallback
}

function defaultSetupPrefs(shipClass = 'Scout') {
  const safeShipClass = SHIP_PRESETS[shipClass] ? shipClass : 'Scout'
  return {
    shipClass: safeShipClass,
    shipName: SHIP_NAME_DEFAULTS[safeShipClass] || 'Wayfarer',
    playerName: DEFAULT_PLAYER_NAME,
  }
}

function sanitizeSetupPrefs(candidate) {
  const base = defaultSetupPrefs(candidate?.shipClass)
  return {
    shipClass: base.shipClass,
    shipName: sanitizeName(candidate?.shipName, base.shipName),
    playerName: sanitizeName(candidate?.playerName, DEFAULT_PLAYER_NAME),
  }
}

function sameSetupPrefs(a, b) {
  return a?.shipClass === b?.shipClass && a?.shipName === b?.shipName && a?.playerName === b?.playerName
}

function setupFromRun(run) {
  return sanitizeSetupPrefs({
    shipClass: run?.player?.shipClass,
    shipName: run?.shipName,
    playerName: run?.playerName,
  })
}

function hashSeed(input) {
  const str = String(input)
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRng(seed) {
  const maker = hashSeed(seed)
  const rand = mulberry32(maker())
  return {
    next: () => rand(),
    int: (min, max) => Math.floor(rand() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(rand() * items.length)],
    chance: (p) => rand() < p,
  }
}

function randomName(rng) { return `${rng.pick(NAME_A)} ${rng.pick(NAME_B)}` }
function crewName(rng) { return rng.chance(0.5) ? rng.pick(CREW_F) : rng.pick(CREW_M) }
function degToRad(deg) { return (deg - 90) * (Math.PI / 180) }
function polarToXY(cx, cy, radius, deg) { const rad = degToRad(deg); return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius } }
function angleOfSlot(slot, slotCount, offset) { return ((slot + offset + 0.5) / slotCount) * 360 }
function boundaryAngleOfSlot(slotBoundary, slotCount) { return (slotBoundary / slotCount) * 360 }
function ringRadius(orbit) { return 40 + orbit * 28 }
function orbitRotationDeg(system, orbit) { return (360 * system.orbitOffsets[orbit]) / MASTER.slotCounts[orbit] }
function nodeAngle(system, node) { return angleOfSlot(node.slot, MASTER.slotCounts[node.orbit], system.orbitOffsets[node.orbit]) }
function nodePosition(system, node) { return polarToXY(180, 180, ringRadius(node.orbit), nodeAngle(system, node)) }
function nodeDistance(system, a, b) { const pa = nodePosition(system, a); const pb = nodePosition(system, b); return Math.hypot(pa.x - pb.x, pa.y - pb.y) }
function movementRange(run) { return run.player.speed * 46 }
function dodgeChance(maneuverability) { return clamp((maneuverability || 0) * 0.08, 0, 0.45) }
function emptySkillState(skillId) {
  const skill = CREW_SKILL_DEFS[skillId]
  return {
    level: 0,
    perks: Object.fromEntries((skill?.perks || []).map((perk) => [perk.id, 0])),
  }
}

function skillState(member, skillId) {
  const base = emptySkillState(skillId)
  const current = member?.skills?.[skillId]
  return {
    level: Math.max(0, Number(current?.level) || 0),
    perks: {
      ...base.perks,
      ...(current?.perks || {}),
    },
  }
}

function crewSkillLevel(member, skillId) {
  return skillState(member, skillId).level
}

function crewPerkLevel(member, skillId, perkId) {
  return Math.max(0, Math.min(5, Number(skillState(member, skillId).perks?.[perkId]) || 0))
}

function skillLabel(skillId) {
  return CREW_SKILL_DEFS[skillId]?.label || skillId
}

function perkLabel(skillId, perkId) {
  return CREW_SKILL_DEFS[skillId]?.perks?.find((perk) => perk.id === perkId)?.label || perkId
}

function defaultCrewSkills(role) {
  const skillId = ROLE_DEFAULT_SKILLS[role]
  if (!skillId) return {}
  const firstPerk = CREW_SKILL_DEFS[skillId]?.perks?.[0]?.id
  return applyCrewSkillChoice({ skills: {} }, skillId, firstPerk).skills
}

function applyCrewSkillChoice(member, skillId, perkId) {
  if (!CREW_SKILL_DEFS[skillId]) return member
  const current = skillState(member, skillId)
  const nextMember = {
    ...member,
    skills: {
      ...(member.skills || {}),
      [skillId]: {
        ...current,
        level: Math.max(1, current.level + 1),
        perks: {
          ...current.perks,
          ...(perkId ? { [perkId]: clamp((current.perks?.[perkId] || 0) + 1, 0, 5) } : {}),
        },
      },
    },
  }
  return nextMember
}

function pilotDodgeBonus(run) {
  return Math.max(0, ...(run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).map((member) => crewPerkLevel(member, 'pilot', 'dodge')))
}

function pilotSpeedBonus(run) {
  return Math.max(0, ...(run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).map((member) => crewPerkLevel(member, 'pilot', 'speed')))
}

function pilotStealthBonus(run) {
  return Math.max(0, ...(run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).map((member) => crewPerkLevel(member, 'pilot', 'stealth')))
}

function playerSpeedValue(run) {
  return Math.max(1, (run?.player?.speed || 1) + pilotSpeedBonus(run))
}

function playerStealthValue(run) {
  return Math.max(0, (run?.player?.stealth || 0) + pilotStealthBonus(run))
}

function enemyStealthValue(enemy) {
  return Math.max(0, Number(enemy?.stealth) || 0)
}

function adjustDetectionChance(baseChance, observerStealth, targetStealth) {
  const stealthDelta = (Number(observerStealth) || 0) - (Number(targetStealth) || 0)
  return clamp(baseChance + stealthDelta * 0.05, 0.02, 0.95)
}

function meteorLineEndpoints(path) { return { p1: polarToXY(180, 180, 220, path.angleDeg), p2: polarToXY(180, 180, 220, path.angleDeg + 180) } }

function meteorPathDistanceToNode(system, node, meteorPath) {
  if (!meteorPath) return Infinity
  const pos = nodePosition(system, node)
  const rad = degToRad(meteorPath.angleDeg)
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)
  const dx = pos.x - 180
  const dy = pos.y - 180
  return Math.abs(dx * uy - dy * ux)
}

function nodeOnMeteorPath(system, node, meteorPath) {
  return meteorPathDistanceToNode(system, node, meteorPath) <= meteorPath.width
}

function ringBand(orbit) {
  const center = ringRadius(orbit)
  const inner = orbit === 0 ? 22 : (ringRadius(orbit - 1) + center) / 2
  const outer = orbit === MASTER.orbitCount - 1 ? center + (center - inner) : (center + ringRadius(orbit + 1)) / 2
  return { inner, outer, center }
}

function arcPoint(cx, cy, radius, deg) {
  const rad = degToRad(deg)
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius }
}

function describeRingSegment(cx, cy, innerRadius, outerRadius, startDeg, endDeg) {
  const startOuter = arcPoint(cx, cy, outerRadius, startDeg)
  const endOuter = arcPoint(cx, cy, outerRadius, endDeg)
  const endInner = arcPoint(cx, cy, innerRadius, endDeg)
  const startInner = arcPoint(cx, cy, innerRadius, startDeg)
  const span = Math.abs(endDeg - startDeg)
  const largeArc = span > 180 ? 1 : 0
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

function segmentBaseFill(orbit, slot) {
  const orbitBias = orbit % 2 === 0 ? 0.075 : 0.06
  const slotBias = slot % 2 === 0 ? 0.03 : 0
  return `rgba(255,255,255,${orbitBias + slotBias})`
}

function equipmentLevel(value) {
  return clamp(Math.round(Number(value) || 1), 1, 5)
}

function droneMoveRange() {
  return Math.max(1, Math.round(HEX_ARENA.cols * 0.3))
}

function hexCombatShipMovePoints(speed) {
  return clamp(Math.ceil(Math.max(1, Number(speed) || 1) / 2), 1, Math.max(1, droneMoveRange() - 1))
}

function equipmentLevelSuffix(level) {
  return `Mk ${equipmentLevel(level)}`
}

function equipmentPrice(definition, level = 1) {
  return Math.max(1, Math.round((definition?.price || 0) * (1 + (equipmentLevel(level) - 1) * 0.38)))
}

function weaponStatsForLevel(definition, level = 1) {
  const safeLevel = equipmentLevel(level)
  const bonus = safeLevel - 1
  return {
    level: safeLevel,
    damage: Math.max(1, Math.round((definition?.damage || 1) * (1 + bonus * 0.14))),
    accuracy: clamp((definition?.accuracy || 0.5) + bonus * 0.015, 0.2, 0.98),
    hpMax: Math.max(1, Math.round((definition?.hpMax || 12) * (1 + bonus * 0.1))),
    cooldown: Math.max(0.35, (definition?.cooldown || 1) * (1 - bonus * 0.06)),
  }
}

function hexCombatWeaponCooldownTurns(weapon) {
  if (!weapon) return 1
  return 1
}

function buildHexShipUnit(side, overrides = {}) {
  const width = Math.max(2, Number(overrides.width) || 2)
  const height = Math.max(3, Number(overrides.height) || 3)
  const actionsPerTurn = Math.max(1, Number(overrides.actionsPerTurn ?? overrides.movePointsPerTurn) || 1)
  return {
    id: `${side}_ship_unit`,
    side,
    type: 'ship',
    width,
    height,
    col: clamp(Number.isFinite(Number(overrides.col)) ? Number(overrides.col) : (side === 'player' ? 0 : HEX_ARENA.cols - width), 0, Math.max(0, HEX_ARENA.cols - width)),
    row: clamp(Number.isFinite(Number(overrides.row)) ? Number(overrides.row) : Math.max(0, Math.floor((HEX_ARENA.rows - height) / 2)), 0, Math.max(0, HEX_ARENA.rows - height)),
    actionsPerTurn,
    actionsRemaining: clamp(Number.isFinite(Number(overrides.actionsRemaining ?? overrides.movePointsRemaining)) ? Number(overrides.actionsRemaining ?? overrides.movePointsRemaining) : actionsPerTurn, 0, actionsPerTurn),
    attackAvailable: overrides.attackAvailable !== false,
    movedThisTurn: Boolean(overrides.movedThisTurn),
    firedThisTurn: Boolean(overrides.firedThisTurn),
  }
}

function hexCombatShipFootprint(unit) {
  const safeUnit = buildHexShipUnit(unit?.side || 'player', unit || {})
  return Array.from({ length: Math.max(2, safeUnit.width || 2) }, (_, dx) => (
    Array.from({ length: Math.max(3, safeUnit.height || 3) }, (_, dy) => ({ col: safeUnit.col + dx, row: safeUnit.row + dy }))
  )).flat()
}

function hexCombatShipCenter(unit) {
  const footprint = hexCombatShipFootprint(unit)
  return footprint[Math.floor((footprint.length - 1) / 2)] || { col: 0, row: 0 }
}

function hexEquals(a, b) {
  return a?.col === b?.col && a?.row === b?.row
}

function hexCombatShipAnchor(side) {
  return hexCombatShipCenter(buildHexShipUnit(side))
}

function hexCombatLaunchHex(side, shipUnit = null) {
  const unit = shipUnit ? buildHexShipUnit(side, shipUnit) : buildHexShipUnit(side)
  const center = hexCombatShipCenter(unit)
  return {
    col: clamp(side === 'player' ? unit.col + unit.width : unit.col - 1, 0, HEX_ARENA.cols - 1),
    row: clamp(center.row, 0, HEX_ARENA.rows - 1),
  }
}

function buildDroneUnit() {
  return { shield: 1, armour: 1, hull: 1 }
}

function buildAttackSquadron(side, position = hexCombatLaunchHex(side), overrides = {}) {
  const actionsPerTurn = Math.max(1, Number(overrides.actionsPerTurn) || droneMoveRange())
  return {
    id: createId(`${side}_squadron`),
    side,
    type: 'attack',
    position: { ...position },
    drones: Array.from({ length: DRONE_SQUADRON_SIZE }, () => buildDroneUnit()),
    actionsPerTurn,
    actionsRemaining: clamp(Number.isFinite(Number(overrides.actionsRemaining)) ? Number(overrides.actionsRemaining) : actionsPerTurn, 0, actionsPerTurn),
    attackAvailable: overrides.attackAvailable !== false,
    movedThisTurn: Boolean(overrides.movedThisTurn),
    regenTick: 0,
    launchedTurn: 0,
  }
}

function aliveSquadronDrones(squadron) {
  return (squadron?.drones || []).filter((drone) => (drone.hull || 0) > 0)
}

function squadronAliveCount(squadron) {
  return aliveSquadronDrones(squadron).length
}

function squadronShieldCount(squadron) {
  return aliveSquadronDrones(squadron).reduce((sum, drone) => sum + Math.max(0, drone.shield || 0), 0)
}

function squadronArmourCount(squadron) {
  return aliveSquadronDrones(squadron).reduce((sum, drone) => sum + Math.max(0, drone.armour || 0), 0)
}

function oddrToCube(col, row) {
  const x = col - ((row - (row & 1)) / 2)
  const z = row
  const y = -x - z
  return { x, y, z }
}

function hexDistance(a, b) {
  const cubeA = oddrToCube(a.col, a.row)
  const cubeB = oddrToCube(b.col, b.row)
  return Math.max(Math.abs(cubeA.x - cubeB.x), Math.abs(cubeA.y - cubeB.y), Math.abs(cubeA.z - cubeB.z))
}

function hexWithinArena(position) {
  return position.col >= 0 && position.col < HEX_ARENA.cols && position.row >= 0 && position.row < HEX_ARENA.rows
}

function distanceToHexGroup(source, hexes = []) {
  if (!source || !Array.isArray(hexes) || hexes.length === 0) return Number.POSITIVE_INFINITY
  return Math.min(...hexes.map((hex) => hexDistance(source, hex)))
}

function squadronAdjacentToShip(squadron, sideOrUnit) {
  if (!squadron) return false
  const footprint = typeof sideOrUnit === 'string' ? hexCombatShipFootprint(buildHexShipUnit(sideOrUnit)) : hexCombatShipFootprint(sideOrUnit)
  return distanceToHexGroup(squadron.position, footprint) <= 1
}

function applyDamageToSquadron(squadron, amount) {
  if (!squadron) return { squadron, detail: 'NO SQUADRON', destroyed: false }
  let remaining = Math.max(0, Math.round(Number(amount) || 0))
  const nextSquadron = deepClone(squadron)
  while (remaining > 0) {
    const target = nextSquadron.drones.find((drone) => (drone.hull || 0) > 0 && (drone.shield || 0) > 0)
      || nextSquadron.drones.find((drone) => (drone.hull || 0) > 0 && (drone.armour || 0) > 0)
      || nextSquadron.drones.find((drone) => (drone.hull || 0) > 0)
    if (!target) break
    if ((target.shield || 0) > 0) target.shield -= 1
    else if ((target.armour || 0) > 0) target.armour -= 1
    else target.hull -= 1
    remaining -= 1
  }
  const lost = Math.max(0, squadronAliveCount(squadron) - squadronAliveCount(nextSquadron))
  return {
    squadron: nextSquadron,
    detail: `SQUADRON ${squadronAliveCount(nextSquadron)}/${DRONE_SQUADRON_SIZE} · SHIELDS ${squadronShieldCount(nextSquadron)} · ARMOUR ${squadronArmourCount(nextSquadron)}`,
    destroyed: squadronAliveCount(nextSquadron) <= 0,
    lost,
  }
}

function regenerateSquadronShield(squadron) {
  if (!squadron) return squadron
  const nextSquadron = deepClone(squadron)
  nextSquadron.regenTick = (nextSquadron.regenTick || 0) + 1
  if (nextSquadron.regenTick < DRONE_REGEN_INTERVAL) return nextSquadron
  nextSquadron.regenTick = 0
  const drone = nextSquadron.drones.find((entry) => (entry.hull || 0) > 0 && (entry.shield || 0) <= 0)
  if (drone) drone.shield = 1
  return nextSquadron
}

function prepareWeaponForHexCombat(weapon, index = 0) {
  if (!weapon) return null
  return buildWeaponInstance(weapon.id, index, {
    ...weapon,
    cooldownRemaining: 0,
    lastShotAt: 0,
    nextShotAt: 0,
    hexReadyIn: 0,
    hexCooldownTurns: hexCombatWeaponCooldownTurns(weapon),
  })
}

function decrementHexWeaponCooldowns(weapons) {
  return (weapons || []).map((weapon) => weapon ? { ...weapon, hexReadyIn: Math.max(0, Number(weapon.hexReadyIn) || 0) - 1 } : null)
}

function activeSquadrons(combat, side) {
  return (combat?.squadrons || []).filter((squadron) => squadron.side === side && squadronAliveCount(squadron) > 0)
}

function activeSquadron(combat, side) {
  return activeSquadrons(combat, side)[0] || null
}

function allCombatUnits(run, side) {
  if (!run?.combat) return []
  const shipUnit = side === 'player' ? run.combat.playerShipUnit : run.combat.enemyShipUnit
  return [shipUnit, ...activeSquadrons(run.combat, side)].filter(Boolean)
}

function findCombatUnit(run, unitId) {
  if (!run?.combat || !unitId) return null
  if (run.combat.playerShipUnit?.id === unitId) return { side: 'player', kind: 'ship', unit: run.combat.playerShipUnit }
  if (run.combat.enemyShipUnit?.id === unitId) return { side: 'enemy', kind: 'ship', unit: run.combat.enemyShipUnit }
  const squadron = (run.combat.squadrons || []).find((entry) => entry.id === unitId)
  if (!squadron) return null
  return { side: squadron.side, kind: 'squadron', unit: squadron }
}

function combatOccupiedHexes(combat, excludeUnitId = null) {
  const occupied = []
  if (combat?.playerShipUnit?.id !== excludeUnitId) occupied.push(...hexCombatShipFootprint(combat.playerShipUnit))
  if (combat?.enemyShipUnit?.id !== excludeUnitId) occupied.push(...hexCombatShipFootprint(combat.enemyShipUnit))
  ;(combat?.squadrons || []).forEach((squadron) => {
    if (!squadron || squadron.id === excludeUnitId || squadronAliveCount(squadron) <= 0) return
    occupied.push({ ...squadron.position })
  })
  return occupied
}

function hexCombatShipStepTargets(combat, side, unitOverride = null) {
  const unit = unitOverride ? buildHexShipUnit(side, unitOverride) : (side === 'player' ? combat?.playerShipUnit : combat?.enemyShipUnit)
  if (!unit) return []
  return [
    { col: unit.col + 1, row: unit.row, label: 'Advance' },
    { col: unit.col - 1, row: unit.row, label: 'Retreat' },
    { col: unit.col, row: unit.row - 1, label: 'Up' },
    { col: unit.col, row: unit.row + 1, label: 'Down' },
  ].filter((target) => {
    const candidate = buildHexShipUnit(side, { ...unit, col: target.col, row: target.row })
    const footprint = hexCombatShipFootprint(candidate)
    return footprint.every((hex) => hexWithinArena(hex))
      && footprint.every((hex) => !combatOccupiedHexes(combat, unit.id).some((occupied) => hexEquals(hex, occupied)))
  })
}

function hexCombatShipMoveTargets(combat, side, moveBudget = null) {
  const unit = side === 'player' ? combat?.playerShipUnit : combat?.enemyShipUnit
  if (!unit) return []
  const maxSteps = Math.max(0, Number(moveBudget ?? unit.actionsRemaining) || 0)
  if (maxSteps <= 0) return []
  const queue = [{ unit: buildHexShipUnit(side, unit), distance: 0 }]
  const seen = new Map([[`${unit.col}:${unit.row}`, 0]])
  const results = []

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.distance >= maxSteps) continue
    const nextSteps = hexCombatShipStepTargets(combat, side, current.unit)
    nextSteps.forEach((target) => {
      const distance = current.distance + 1
      const key = `${target.col}:${target.row}`
      if (seen.has(key) && seen.get(key) <= distance) return
      seen.set(key, distance)
      const candidateUnit = buildHexShipUnit(side, { ...current.unit, col: target.col, row: target.row })
      queue.push({ unit: candidateUnit, distance })
      results.push({
        col: target.col,
        row: target.row,
        distance,
        label: distance === 1 ? target.label : `Reposition ${distance}`,
      })
    })
  }

  return results.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col)
}

function shipWeaponsForSide(run, side) {
  return side === 'player' ? (run?.player?.weaponSlots || []) : (run?.combat?.enemy?.weapons || [])
}

function readyHexShipWeaponIndices(run, side) {
  const isPlayerSide = side === 'player'
  return shipWeaponsForSide(run, side).reduce((indices, weapon, index) => {
    if (weaponCanFireInHexCombat(run, weapon, isPlayerSide)) indices.push(index)
    return indices
  }, [])
}

function combatUnitCanMove(unit) {
  return (unit?.actionsRemaining || 0) > 0
}

function combatUnitCanAttack(run, entry) {
  if (!entry) return false
  if (entry.kind === 'ship') return readyHexShipWeaponIndices(run, entry.side).length > 0
  return entry.unit?.attackAvailable !== false && squadronAliveCount(entry.unit) > 0
}

function combatUnitCanAct(run, entry) {
  return combatUnitCanMove(entry?.unit) || combatUnitCanAttack(run, entry)
}

function combatUnitStatusLabel(run, entry) {
  if (!entry) return 'Spent'
  const moveLabel = combatUnitCanMove(entry.unit) ? `${entry.unit.actionsRemaining} move` : null
  if (entry.kind === 'ship') {
    const readyWeapons = readyHexShipWeaponIndices(run, entry.side).length
    const fireLabel = readyWeapons > 0 ? `${readyWeapons} gun${readyWeapons === 1 ? '' : 's'} ready` : null
    return [moveLabel, fireLabel].filter(Boolean).join(' · ') || 'Spent'
  }
  const strikeLabel = entry.unit?.attackAvailable !== false ? 'Strike ready' : null
  return [moveLabel, strikeLabel].filter(Boolean).join(' · ') || 'Spent'
}

function combatUnitSummary(run, unitId) {
  const entry = findCombatUnit(run, unitId)
  if (!entry) return null
  if (entry.kind === 'ship') {
    const entity = entry.side === 'player' ? run.player : run.combat.enemy
    return {
      id: unitId,
      side: entry.side,
      kind: 'ship',
      name: entry.side === 'player' ? run.shipName : run.combat.enemy.name,
      subtitle: entry.side === 'player' ? run.player.shipClass : `${run.combat.enemy.kind} vessel`,
      countLabel: '1/1',
      canAct: combatUnitCanAct(run, entry),
      statusLabel: combatUnitStatusLabel(run, entry),
      hull: entity.hull,
      hullMax: entity.hullMax,
      shields: entity.shields,
      shieldsMax: entity.shieldsMax,
      armour: entity.armour,
      armourMax: entity.armourMax || entity.armour,
      speed: entry.side === 'player' ? playerSpeedValue(run) : entity.speed,
      dodge: Math.round(dodgeChance(entry.side === 'player' ? run.player.maneuverability + pilotManeuverBonus(run) : entity.maneuverability) * 100),
      stealth: entry.side === 'player' ? playerStealthValue(run) : entity.stealth,
      unit: entry.unit,
      weapons: entry.side === 'player' ? run.player.weaponSlots.filter(Boolean) : run.combat.enemy.weapons.filter(Boolean),
    }
  }
  return {
    id: unitId,
    side: entry.side,
    kind: 'squadron',
    name: entry.side === 'player' ? 'Attack squadron Alpha' : 'Attack squadron',
    subtitle: 'Drone squadron',
    countLabel: `${squadronAliveCount(entry.unit)}/${DRONE_SQUADRON_SIZE}`,
    canAct: combatUnitCanAct(run, entry),
    statusLabel: combatUnitStatusLabel(run, entry),
    hull: squadronAliveCount(entry.unit),
    hullMax: DRONE_SQUADRON_SIZE,
    shields: squadronShieldCount(entry.unit),
    shieldsMax: DRONE_SQUADRON_SIZE,
    armour: squadronArmourCount(entry.unit),
    armourMax: DRONE_SQUADRON_SIZE,
    speed: droneMoveRange(),
    dodge: 0,
    stealth: 0,
    unit: entry.unit,
    weapons: [],
  }
}

function combatUnitSummaries(run, side) {
  return allCombatUnits(run, side).map((unit) => combatUnitSummary(run, unit.id)).filter(Boolean)
}

function combatHangarSummaries(run, side) {
  if (!run?.combat) return []
  const activeCount = activeSquadrons(run.combat, side).length
  const reserveCount = Math.max(0, (run.combat.squadronLimit || DRONE_ACTIVE_LIMIT) - activeCount)
  return Array.from({ length: reserveCount }, (_, index) => ({
    id: `${side}_hangar_attack_${index + 1}`,
    side,
    kind: 'hangar',
    name: side === 'player' ? `Attack squadron ${String.fromCharCode(65 + index)}` : `Enemy squadron ${index + 1}`,
    subtitle: side === 'player' ? 'Reserve attack drones' : 'Reserve hostile drones',
    countLabel: `${DRONE_SQUADRON_SIZE}/${DRONE_SQUADRON_SIZE}`,
    canAct: side === 'player'
      ? ((run.combat.droneBayCooldown || 0) <= 0 && !run.combat.outcome)
      : ((run.combat.enemyDroneBayCooldown || 0) <= 0 && !run.combat.outcome),
    deployable: side === 'player'
      ? ((run.combat.droneBayCooldown || 0) <= 0 && !run.combat.outcome)
      : ((run.combat.enemyDroneBayCooldown || 0) <= 0 && !run.combat.outcome),
    statusLabel: side === 'player'
      ? ((run.combat.droneBayCooldown || 0) > 0 ? `Recycle ${run.combat.droneBayCooldown} turn(s)` : 'Ready')
      : ((run.combat.enemyDroneBayCooldown || 0) > 0 ? `Recycle ${run.combat.enemyDroneBayCooldown} turn(s)` : 'Ready'),
  }))
}

function deployHexCombatSquadron(next, side = 'player') {
  if (!next?.combat || next.screen !== 'combat_hex' || next.combat.outcome) return { next, deployed: false, message: 'Combat unavailable.' }
  const shipKey = side === 'player' ? 'playerShipUnit' : 'enemyShipUnit'
  const cooldownKey = side === 'player' ? 'droneBayCooldown' : 'enemyDroneBayCooldown'
  const label = side === 'player' ? 'Player' : 'Enemy'
  const displayName = side === 'player' ? 'attack squadron' : 'enemy attack squadron'
  if (activeSquadrons(next.combat, side).length >= (next.combat.squadronLimit || DRONE_ACTIVE_LIMIT)) return { next, deployed: false, message: `${label} cannot support another active squadron.` }
  if ((next.combat[cooldownKey] || 0) > 0) return { next, deployed: false, message: `${label} drone bay is recycling.` }
  const launchHex = hexCombatLaunchHex(side, next.combat[shipKey])
  if (combatOccupiedHexes(next.combat).some((entry) => hexEquals(entry, launchHex))) return { next, deployed: false, message: `${label} launch corridor is blocked.` }
  const squadron = buildAttackSquadron(side, launchHex, { actionsRemaining: 0, attackAvailable: false })
  squadron.launchedTurn = next.combat.turnNumber || 1
  next.combat.squadrons = [...(next.combat.squadrons || []), squadron]
  next.combat.selectedTargetUnitId = side === 'player' ? (next.combat.enemyShipUnit?.id || null) : next.combat.selectedTargetUnitId
  if (side === 'player') {
    next.combat.selectedUnitId = squadron.id
    next.combat.selectedHex = { ...squadron.position }
  }
  return {
    next,
    deployed: true,
    squadron,
    message: `${label}: Deployed ${displayName} (${DRONE_SQUADRON_SIZE}/${DRONE_SQUADRON_SIZE}).`,
  }
}

function hexCombatReachableHexes(run, unitId = null) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return []
  const selectedId = unitId || run.combat.selectedUnitId
  const entry = findCombatUnit(run, selectedId)
  if (!entry || entry.side !== 'player' || !combatUnitCanMove(entry.unit)) return []
  if (entry.kind === 'ship') return hexCombatShipMoveTargets(run.combat, 'player', entry.unit.actionsRemaining).map((move) => ({ col: move.col, row: move.row, label: move.label }))
  return Array.from({ length: HEX_ARENA.cols * HEX_ARENA.rows }, (_, index) => ({ col: index % HEX_ARENA.cols, row: Math.floor(index / HEX_ARENA.cols) }))
    .filter((hex) => hexDistance(entry.unit.position, hex) <= (entry.unit.actionsRemaining || 0) && !hexEquals(hex, entry.unit.position) && !combatOccupiedHexes(run.combat, entry.unit.id).some((occupied) => hexEquals(occupied, hex)))
}

function setHexCombatTargetUnit(run, unitId) {
  if (!run?.combat) return run
  const target = findCombatUnit(run, unitId)
  if (!target || target.side !== 'enemy') return run
  const next = deepClone(run)
  next.combat.selectedTargetUnitId = unitId
  if (next.ui?.selectedCombatWeaponSide === 'player' && Number.isInteger(next.ui?.selectedCombatWeaponIndex) && next.player.weaponSlots?.[next.ui.selectedCombatWeaponIndex]) {
    next.player.weaponSlots[next.ui.selectedCombatWeaponIndex].hexTargetUnitId = unitId
  }
  return next
}

function hexCombatAttackPreview(run, attackerId = null, targetId = null) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return { canAttack: false, reason: 'Combat inactive' }
  const attacker = findCombatUnit(run, attackerId || run.combat.selectedUnitId)
  const target = findCombatUnit(run, targetId || run.combat.selectedTargetUnitId)
  if (!attacker || attacker.side !== 'player') return { canAttack: false, reason: 'Select a player unit' }
  if (!target || target.side !== 'enemy') return { canAttack: false, reason: 'Select an enemy target' }
  if (attacker.kind === 'squadron') {
    const inRange = target.kind === 'ship' ? squadronAdjacentToShip(attacker.unit, target.unit) : hexDistance(attacker.unit.position, target.unit.position) <= 1
    if (attacker.unit?.attackAvailable === false) return { canAttack: false, reason: 'Strike already used', attacker, target, mode: 'squadron' }
    return {
      canAttack: inRange,
      reason: inRange ? 'Attack ready' : 'Out of range',
      attacker,
      target,
      mode: 'squadron',
    }
  }
  const selectedWeaponIndex = run.ui?.selectedCombatWeaponSide === 'player'
    && Number.isInteger(run.ui?.selectedCombatWeaponIndex)
    && weaponCanFireInHexCombat(run, run.player.weaponSlots?.[run.ui.selectedCombatWeaponIndex], true)
    ? run.ui.selectedCombatWeaponIndex
    : (run.player.weaponSlots || []).findIndex((weapon) => weaponCanFireInHexCombat(run, weapon, true))
  if (selectedWeaponIndex < 0) return { canAttack: false, reason: 'No ready weapon', attacker, target, mode: 'ship' }
  return {
    canAttack: true,
    reason: 'Attack ready',
    attacker,
    target,
    mode: 'ship',
    weaponIndex: selectedWeaponIndex,
  }
}

function moveSelectedHexCombatUnit(run, targetHex) {
  if (!run?.combat) return run
  const selected = findCombatUnit(run, run.combat.selectedUnitId)
  if (!selected || selected.side !== 'player') return run
  if (selected.kind === 'ship') return moveHexCombatShip(run, 'player', targetHex)
  return moveHexCombatSquadron(run, targetHex)
}

function attackSelectedHexCombatTarget(run, targetId) {
  const targeted = setHexCombatTargetUnit(run, targetId)
  const preview = hexCombatAttackPreview(targeted, targeted?.combat?.selectedUnitId, targetId)
  if (!preview.canAttack) return targeted
  if (preview.mode === 'ship') return fireHexCombatShipWeapon(targeted, preview.weaponIndex)
  return fireHexCombatSquadron(targeted, preview.attacker.unit.id)
}

function crewXpThresholdForLevel(level) {
  return CREW_LEVEL_THRESHOLDS[Math.max(0, Math.min(CREW_LEVEL_THRESHOLDS.length - 1, level - 1))]
}

function xpToNextCrewLevel(member) {
  const currentLevel = crewLevel(member)
  if (currentLevel >= CREW_LEVEL_THRESHOLDS.length) return 0
  return Math.max(0, crewXpThresholdForLevel(currentLevel + 1) - (Number(member?.xp) || 0))
}

function buildWeaponInstance(id, index = 0, overrides = {}) {
  const definition = WEAPONS[id]
  if (!definition) return null
  const level = equipmentLevel(overrides.level)
  const levelStats = weaponStatsForLevel(definition, level)
  const maxHp = Math.max(1, Number(overrides.maxHp) || levelStats.hpMax || definition.hpMax || 12)
  const hpProvided = Object.prototype.hasOwnProperty.call(overrides, 'hp')
  const rawHp = hpProvided ? Number(overrides.hp) : maxHp
  const hp = clamp(Number.isFinite(rawHp) ? rawHp : maxHp, 0, maxHp)
  const broken = overrides.broken === true || hp <= 0
  return {
    ...definition,
    name: `${definition.name} ${equipmentLevelSuffix(level)}`,
    damage: levelStats.damage,
    accuracy: levelStats.accuracy,
    cooldown: levelStats.cooldown,
    baseCooldown: levelStats.cooldown,
    enabled: overrides.enabled !== false && !broken,
    autoReload: overrides.autoReload !== false,
    cooldownRemaining: Math.max(0, Number(overrides.cooldownRemaining) || 0),
    lastShotAt: Number(overrides.lastShotAt) || 0,
    nextShotAt: Number(overrides.nextShotAt) || 0,
    ammoLeft: definition.ammoType ? (Number.isFinite(Number(overrides.ammoLeft)) ? Math.max(0, Number(overrides.ammoLeft)) : (definition.ammoType === 'missile' ? 1 : null)) : null,
    loadedAmmoLevel: definition.ammoType === 'missile' ? equipmentLevel(overrides.loadedAmmoLevel || level) : null,
    maxHp,
    hp,
    broken,
    level,
    targetId: String(overrides.targetId || 'hull'),
    hexTargetUnitId: typeof overrides.hexTargetUnitId === 'string' ? overrides.hexTargetUnitId : null,
    instanceId: overrides.instanceId || `${id}_${index}`,
  }
}

function buildWeaponInstances(loadout) {
  return loadout.map((id, index) => buildWeaponInstance(id, index)).filter(Boolean)
}

function buildWeaponSlotLayout(loadout, slotCount) {
  const equipped = buildWeaponInstances(loadout).slice(0, slotCount)
  return Array.from({ length: slotCount }, (_, index) => equipped[index] || null)
}

function equippedWeapons(player) {
  return Array.isArray(player?.weaponSlots) ? player.weaponSlots.filter(Boolean) : []
}

function isWeaponItemId(itemId) {
  return EQUIPMENT_CATALOG[itemId]?.slotType === 'weapon'
}

function equipmentPowerDraw(itemId) {
  return Math.max(0, Number(EQUIPMENT_CATALOG[itemId]?.powerDraw) || 0)
}

function currentPowerUsage(runOrPlayer) {
  const player = runOrPlayer?.player || runOrPlayer
  return equippedWeapons(player).reduce((sum, weapon) => sum + (weapon?.broken || weapon?.enabled === false ? 0 : equipmentPowerDraw(weapon.id)), 0)
}

function weaponHpRatio(weapon) {
  if (!weapon) return 0
  return clamp((Number(weapon.hp) || 0) / Math.max(1, Number(weapon.maxHp) || 1), 0, 1)
}

function weaponChargeRatio(weapon, now = Date.now()) {
  if (!weapon?.enabled) return 0
  if (weapon.broken) return 0
  if (weapon.nextShotAt && weapon.lastShotAt && weapon.nextShotAt > weapon.lastShotAt) {
    if (now >= weapon.nextShotAt) return 1
    return clamp((now - weapon.lastShotAt) / Math.max(1, weapon.nextShotAt - weapon.lastShotAt), 0, 1)
  }
  if (!weapon.cooldown) return 1
  return clamp(1 - ((weapon.cooldownRemaining || 0) / weapon.cooldown), 0, 1)
}

function hexWeaponReadinessRatio(weapon) {
  if (!weapon?.enabled || weapon.broken) return 0
  const cooldownTurns = Math.max(1, Number(weapon.hexCooldownTurns) || hexCombatWeaponCooldownTurns(weapon))
  const readyIn = clamp(Number(weapon.hexReadyIn) || 0, 0, cooldownTurns)
  return clamp(1 - (readyIn / cooldownTurns), 0, 1)
}

function crewLevel(member) {
  const xp = Math.max(0, Number(member?.xp) || 0)
  for (let level = CREW_LEVEL_THRESHOLDS.length; level >= 1; level -= 1) {
    if (xp >= crewXpThresholdForLevel(level)) return level
  }
  return 1
}

function crewXpIntoLevel(member) {
  const level = crewLevel(member)
  return Math.max(0, (Number(member?.xp) || 0) - crewXpThresholdForLevel(level))
}

function queueCrewAdvancement(next, memberId, level) {
  next.pendingAdvancements = Array.isArray(next.pendingAdvancements) ? next.pendingAdvancements : []
  const levelNumber = Math.max(2, Number(level) || 2)
  if (next.pendingAdvancements.some((entry) => entry.crewId === memberId && entry.level === levelNumber)) return
  next.pendingAdvancements.push({
    id: createId('crew_level'),
    crewId: memberId,
    level: levelNumber,
  })
}

function awardCrewXp(next, amount, filterFn = () => true) {
  const safeAmount = Math.max(0, Number(amount) || 0)
  if (safeAmount <= 0) return []
  const levelUps = []
  next.crew = (next.crew || []).map((member) => {
    if (!filterFn(member)) return member
    const previousLevel = crewLevel(member)
    const updated = { ...member, xp: Math.max(0, (Number(member.xp) || 0) + safeAmount) }
    const newLevel = crewLevel(updated)
    if (newLevel > previousLevel) {
      for (let level = previousLevel + 1; level <= newLevel; level += 1) queueCrewAdvancement(next, member.id, level)
      levelUps.push(`${member.name} reached level ${newLevel}.`)
    }
    return updated
  })
  if (levelUps.length > 0) next.log = [...levelUps.map((entry) => formatLogEntry(next.turn, entry)), ...(next.log || [])]
  return levelUps
}

function highestCrewLevel(run, role) {
  return Math.max(0, ...(run?.crew || []).filter((member) => member.role === role).map((member) => crewLevel(member)))
}

function crewHasWantedStatus(member) {
  return Boolean(member?.wanted || String(member?.wantedReason || '').trim())
}

function scrapperBonus(run, perkId) {
  return (run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).reduce((sum, member) => sum + crewPerkLevel(member, 'scrapper', perkId), 0)
}

function scaleScrapGain(baseAmount, bonusLevels, perLevel = 0.08) {
  return Math.max(0, Math.round(baseAmount * (1 + Math.max(0, bonusLevels) * perLevel)))
}

function formatLogEntry(turn, text) {
  return `[Turn ${Math.max(0, Number(turn) || 0)}] ${text}`
}

function extractLogTurn(entry) {
  const match = String(entry || '').match(/^\[Turn (\d+)\]\s*/)
  return match ? Number(match[1]) : null
}

function rawLogText(entry) {
  return String(entry || '').replace(/^\[Turn \d+\]\s*/, '')
}

function buildCargoItem(itemId, weaponState = null, overrides = {}) {
  return {
    id: createId('cargo'),
    itemId,
    level: equipmentLevel(overrides.level || weaponState?.level || 1),
    amount: Math.max(1, Number(overrides.amount) || 1),
    missileLevel: equipmentLevel(overrides.missileLevel || overrides.level || 1),
    weaponState: isWeaponItemId(itemId) && weaponState ? buildWeaponInstance(itemId, 0, { ...weaponState, level: weaponState?.level || overrides.level || 1 }) : undefined,
  }
}

function buildMissileCargo(level = 1, amount = MISSILE_CARGO_STACK) {
  return buildCargoItem('Missile_Ammo', null, { level, missileLevel: level, amount })
}

function buildMerchantStock(rng) {
  const count = rng.int(4, 7)
  return Array.from({ length: count }, (_, index) => {
    const itemId = rng.pick(MERCHANT_STOCK_POOL)
    if (itemId === 'Missile_Ammo') {
      const level = rng.int(1, Math.min(5, 1 + Math.floor(rng.next() * 3.4)))
      const amount = MISSILE_CARGO_STACK
      return {
        id: `stock_${itemId}_${index}_${rng.int(100, 999)}`,
        itemId,
        level,
        missileLevel: level,
        amount,
        price: Math.max(8, Math.round((10 + level * 6) * (0.9 + rng.next() * 0.35))),
      }
    }
    const level = rng.int(1, Math.min(5, 1 + Math.floor(rng.next() * 2.8)))
    const basePrice = equipmentPrice(EQUIPMENT_CATALOG[itemId], level) || 10
    return {
      id: `stock_${itemId}_${index}_${rng.int(100, 999)}`,
      itemId,
      level,
      price: Math.max(4, Math.round(basePrice * (0.85 + rng.next() * 0.45))),
    }
  })
}

function equipmentCargoUsed(run) {
  return (run.cargo || []).reduce((sum, item) => sum + (EQUIPMENT_CATALOG[item.itemId]?.size || 1), 0)
}

function reserveFuelAmount(run) {
  return Math.max(0, Number(run?.resources?.reserveFuel) || 0)
}

function reserveFuelCapacity(run) {
  return Math.max(0, (run.player.cargoCapacity - equipmentCargoUsed(run)) * 5)
}

function reserveFuelStacks(run) {
  return Math.ceil(reserveFuelAmount(run) / 5)
}

function cargoUsed(run) {
  return equipmentCargoUsed(run) + reserveFuelStacks(run)
}

function cargoFree(run) {
  return Math.max(0, run.player.cargoCapacity - cargoUsed(run))
}

function totalFuelAvailable(run) {
  return Math.max(0, Number(run?.resources?.fuel) || 0) + reserveFuelAmount(run)
}

function crewAtCapacity(run) {
  return (run?.crew?.length || 0) >= Math.max(1, Number(run?.player?.crewCapacity) || 1)
}

function syncSelectedCargoEntry(next) {
  if (!next?.ui) return next
  const entries = buildCargoGridEntries(next)
  if (!entries.some((entry) => entry.key === next.ui.selectedCargoItemId)) next.ui.selectedCargoItemId = entries[0]?.key || null
  return next
}

function syncSelectedCrew(next) {
  if (!next?.ui) return next
  const crewIds = new Set((next.crew || []).map((member) => member.id))
  if (!crewIds.has(next.ui.selectedCrewId)) next.ui.selectedCrewId = next.crew[0]?.id || null
  return next
}

function spendFuel(next, amount) {
  const fuelCost = Math.max(0, amount)
  const tankUsed = Math.min(next.resources.fuel, fuelCost)
  next.resources.fuel -= tankUsed
  const reserveUsed = Math.min(reserveFuelAmount(next), fuelCost - tankUsed)
  next.resources.reserveFuel = Math.max(0, reserveFuelAmount(next) - reserveUsed)
  syncSelectedCargoEntry(next)
  return { next, tankUsed, reserveUsed, totalUsed: tankUsed + reserveUsed }
}

function addFuel(next, amount) {
  const incoming = Math.max(0, amount)
  const tankRoom = Math.max(0, next.player.fuelCapacity - next.resources.fuel)
  const tankAdded = Math.min(tankRoom, incoming)
  next.resources.fuel += tankAdded
  const reserveRoom = Math.max(0, reserveFuelCapacity(next) - reserveFuelAmount(next))
  const reserveAdded = Math.min(reserveRoom, incoming - tankAdded)
  next.resources.reserveFuel = reserveFuelAmount(next) + reserveAdded
  syncSelectedCargoEntry(next)
  return { next, tankAdded, reserveAdded, accepted: tankAdded + reserveAdded }
}

function fuelStorageSummary(run) {
  return reserveFuelAmount(run) > 0 ? `${run.resources.fuel} + ${reserveFuelAmount(run)} reserve` : `${run.resources.fuel}`
}

function buildCargoGridEntries(run) {
  const entries = []
  ;(run.cargo || []).forEach((item) => {
    if (item.itemId === 'Missile_Ammo') {
      entries.push({
        key: item.id,
        kind: 'missile_ammo',
        itemId: item.itemId,
        title: `Missile crate ${equipmentLevelSuffix(item.missileLevel || item.level)}`,
        subtitle: `${item.amount} missiles stored in cargo`,
        icon: `M${equipmentLevel(item.missileLevel || item.level)}`,
        colour: '#fb923c',
        description: `A cargo missile crate holding ${item.amount} level ${equipmentLevel(item.missileLevel || item.level)} missiles for launcher reloads.`,
        price: equipmentPrice(EQUIPMENT_CATALOG.Missile_Ammo, item.missileLevel || item.level),
        draggable: false,
        amount: item.amount,
        missileLevel: equipmentLevel(item.missileLevel || item.level),
      })
      return
    }
    const definition = EQUIPMENT_CATALOG[item.itemId]
    if (!definition) return
    const weaponState = item.weaponState
    entries.push({
      key: item.id,
      kind: 'equipment',
      itemId: item.itemId,
      title: `${definition.name} ${equipmentLevelSuffix(item.level || weaponState?.level || 1)}`,
      subtitle: weaponState ? `${definition.kind} · ${Math.round(weaponState.hp || 0)}/${weaponState.maxHp} hp` : `${definition.kind} · lvl ${equipmentLevel(item.level)} · ${definition.size} cargo`,
      icon: definition.icon,
      colour: definition.colour,
      description: weaponState?.broken ? `${definition.description} This crate contains a broken weapon assembly that still needs repair.` : definition.description,
      price: equipmentPrice(definition, item.level || weaponState?.level || 1),
      draggable: definition.slotType === 'weapon',
      weaponState,
      level: equipmentLevel(item.level || weaponState?.level || 1),
    })
  })

  let remainingFuel = reserveFuelAmount(run)
  let stackIndex = 0
  while (remainingFuel > 0) {
    const stackFuel = Math.min(5, remainingFuel)
    entries.push({
      key: `fuel_stack_${stackIndex}`,
      kind: 'fuel',
      amount: stackFuel,
      title: 'Reserve fuel',
      subtitle: `${stackFuel} fuel stored in cargo`,
      icon: 'FU',
      colour: '#f59e0b',
      description: 'Reserve fuel stored in cargo tanks. Each occupied cargo square can hold up to 5 extra fuel.',
      draggable: false,
    })
    remainingFuel -= stackFuel
    stackIndex += 1
  }

  return entries
}

function equipmentDisplayName(itemId, level = 1, amount = null) {
  if (itemId === 'Missile_Ammo') return `Missile crate ${equipmentLevelSuffix(level)}${amount ? ` · ${amount}` : ''}`
  return `${EQUIPMENT_CATALOG[itemId]?.name || itemId} ${equipmentLevelSuffix(level)}`
}

function shipyardNetPrice(run, shipClass) {
  const preset = SHIP_PRESETS[shipClass]
  if (!preset) return null
  return Math.max(0, preset.value - Math.max(0, run?.player?.value || 0))
}

function targetAssignmentMap(weapons = []) {
  return weapons.reduce((acc, weapon, index) => {
    if (!weapon) return acc
    const targetId = weapon.targetId || 'hull'
    acc[targetId] = [...(acc[targetId] || []), index + 1]
    return acc
  }, {})
}

function findNpcShip(system, npcId) {
  return (system?.npcs || []).find((npc) => npc.id === npcId) || null
}

function merchantSourceById(system, sourceId) {
  const node = (system?.nodes || []).find((entry) => entry.id === sourceId && entry.kind === 'merchant')
  if (node) return { type: 'node', entity: node }
  const npc = (system?.npcs || []).find((entry) => entry.id === sourceId && Array.isArray(entry.stock))
  if (npc) return { type: 'npc', entity: npc }
  return null
}

function missileDamageBonus(level) {
  return 1 + (equipmentLevel(level) - 1) * 0.2
}

function countMissileAmmo(run) {
  return (run?.cargo || []).filter((item) => item.itemId === 'Missile_Ammo').reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0)
}

function nextMissileReloadSource(run) {
  const stacks = (run?.cargo || []).filter((item) => item.itemId === 'Missile_Ammo' && (item.amount || 0) > 0)
  if (stacks.length === 0) return null
  return stacks.reduce((best, stack) => {
    const bestLevel = equipmentLevel(best?.missileLevel || best?.level || 1)
    const stackLevel = equipmentLevel(stack.missileLevel || stack.level || 1)
    if (!best || stackLevel > bestLevel) return stack
    return best
  }, null)
}

function consumeMissileAmmo(next) {
  const source = nextMissileReloadSource(next)
  if (!source) return null
  const cargoIndex = next.cargo.findIndex((item) => item.id === source.id)
  if (cargoIndex < 0) return null
  const stack = next.cargo[cargoIndex]
  const missileLevel = equipmentLevel(stack.missileLevel || stack.level || 1)
  stack.amount = Math.max(0, (Number(stack.amount) || 0) - 1)
  if (stack.amount <= 0) next.cargo.splice(cargoIndex, 1)
  syncSelectedCargoEntry(next)
  return { missileLevel }
}

function addMissileAmmo(next, amount, level = 1) {
  let remaining = Math.max(0, Number(amount) || 0)
  const safeLevel = equipmentLevel(level)
  while (remaining > 0 && cargoFree(next) > 0) {
    const stackAmount = Math.min(MISSILE_CARGO_STACK, remaining)
    next.cargo.push(buildMissileCargo(safeLevel, stackAmount))
    remaining -= stackAmount
  }
  return Math.max(0, Number(amount) || 0) - remaining
}

function playerHasWeaponSpecialist(run) {
  return (run?.crew || []).some((member) => (member.health ?? member.healthMax ?? 1) > 0 && crewSkillLevel(member, 'weapon_specialist') > 0)
}

function ammoUnitsLabel(ammoType) {
  if (ammoType === 'missile') return 'missiles'
  if (ammoType === 'kinetic_ammo') return 'rounds'
  return ammoType
}

function weaponAmmoCount(run, weapon, isPlayerSide) {
  if (!weapon?.ammoType) return '∞'
  if (isPlayerSide) {
    if (weapon.ammoType === 'missile') return `${Math.max(0, Number(weapon.ammoLeft) || 0)} loaded / ${countMissileAmmo(run)} cargo`
    return Math.max(0, Number(run?.resources?.[weapon.ammoType]) || 0)
  }
  return Number.isFinite(Number(weapon.ammoLeft)) ? Math.max(0, Number(weapon.ammoLeft)) : '∞'
}

function combatTargetLabel(targetId, weapons = []) {
  if (!targetId) return 'Hull'
  if (String(targetId).startsWith('weapon:')) {
    const instanceId = String(targetId).slice(7)
    return weapons.find((weapon) => weapon?.instanceId === instanceId)?.name || 'Weapon'
  }
  return COMBAT_TARGETS.find((target) => target.id === targetId)?.label || 'Hull'
}

function selectableCombatTargets(weapons = []) {
  return [
    ...COMBAT_TARGETS.filter((target) => target.id !== 'weapons'),
    ...weapons.filter(Boolean).map((weapon) => ({ id: `weapon:${weapon.instanceId}`, label: weapon.name })),
  ]
}

function classifyLogEntry(entry) {
  const text = rawLogText(entry)
  if (/combat|destroyed|missed|dodged|hit/i.test(text)) return { icon: '⚔', tone: 'border-rose-800 bg-rose-950/15', label: 'Combat' }
  if (/fuel|transit|travel|arrival|meteor/i.test(text)) return { icon: '⛽', tone: 'border-amber-800 bg-amber-950/15', label: 'Travel' }
  if (/police|illegal|inspection|contraband|pirate/i.test(text)) return { icon: '⚠', tone: 'border-orange-800 bg-orange-950/15', label: 'Security' }
  if (/bought|sold|merchant|scrap|parts|loot|salvage/i.test(text)) return { icon: '▣', tone: 'border-emerald-800 bg-emerald-950/15', label: 'Trade/loot' }
  return { icon: '•', tone: 'border-slate-800 bg-slate-900/55', label: 'System' }
}

function classifyCombatFeedEntry(entry) {
  const text = String(entry || '')
  if (text.startsWith('Player:')) return { tone: 'border-cyan-800 bg-cyan-950/20 text-cyan-100', badge: 'Player' }
  if (text.startsWith('Enemy:')) return { tone: 'border-rose-800 bg-rose-950/20 text-rose-100', badge: 'Enemy' }
  if (/rerouted shield power|jammed enemy targeting|evasive helm|crew repair|crew reload/i.test(text)) return { tone: 'border-emerald-800 bg-emerald-950/20 text-emerald-100', badge: 'Crew' }
  if (/escape attempt failed|combat started/i.test(text)) return { tone: 'border-amber-800 bg-amber-950/20 text-amber-100', badge: 'Alert' }
  return { tone: 'border-slate-800 bg-slate-950/60 text-slate-200', badge: 'Info' }
}

function fuelCostForDistance(run, distance, mode = 'travel') {
  if (mode === 'wait') return 0
  const baseCost = Math.max(1, Math.ceil(distance / Math.max(18, run.player.speed * 22)))
  if (mode === 'meteor') return Math.max(1, baseCost - 1)
  return baseCost
}

function interstellarFuelCost(preview) {
  return preview.transitFuel
}

function shieldLayerCount(entity) {
  return Math.max(1, Math.ceil((entity.shieldsMax || 0) / 6))
}

function chargedShieldLayers(entity) {
  if (!entity.shieldsMax || entity.shields <= 0) return 0
  return clamp(Math.ceil((entity.shields / entity.shieldsMax) * shieldLayerCount(entity)), 0, shieldLayerCount(entity))
}

function buildCrew(rng, isChild = false) {
  const role = isChild ? 'dependent' : rng.pick(['pilot', 'repair', 'diplomat', 'salvager', 'hacker'])
  const wanted = !isChild && rng.chance(0.12)
  return {
    id: createId('crew'),
    name: crewName(rng),
    sex: rng.chance(0.5) ? 'F' : 'M',
    age: isChild ? 0 : rng.int(20, 44),
    isChild,
    role,
    trait: rng.pick(CREW_TRAITS),
    xp: 0,
    healthMax: isChild ? 6 : 12,
    health: isChild ? 6 : 12,
    skills: defaultCrewSkills(role),
    wanted,
    wantedReason: wanted ? rng.pick(WANTED_REASONS) : null,
    alive: true,
  }
}

function buildEnemyCrew(kind) {
  const crewLabels = kind === 'patrol'
    ? ['Helm officer', 'Tactical officer', 'Systems officer']
    : ['Raider helm', 'Boarding chief', 'Gunnery chief']
  return crewLabels.map((label, index) => ({
    id: createId(`enemy_crew_${index}`),
    name: label,
    role: index === 0 ? 'pilot' : index === 1 ? 'weapon_specialist' : 'repair_specialist',
    healthMax: 10,
    health: 10,
  }))
}

function pickTrafficKindForSystem(rng, systemType) {
  const weightedKinds = {
    Pirate: ['pirate', 'pirate', 'merchant', 'civilian'],
    Frontier: ['merchant', 'pirate', 'civilian', 'civilian', 'patrol'],
    Militarised: ['patrol', 'patrol', 'merchant', 'civilian'],
    Research: ['civilian', 'merchant', 'patrol', 'civilian'],
    Industrial: ['merchant', 'merchant', 'civilian', 'patrol'],
    'AI Controlled': ['patrol', 'patrol', 'civilian', 'merchant'],
    Civilised: ['merchant', 'civilian', 'civilian', 'patrol'],
  }
  return rng.pick(weightedKinds[systemType] || weightedKinds.Civilised)
}

function preferredNpcNodes(system, kind) {
  const nodes = (system?.nodes || []).filter((node) => !node.kind.startsWith('base'))
  if (nodes.length === 0) return system?.nodes || []
  if (kind === 'pirate') return nodes.filter((node) => node.orbit >= 2) || nodes
  if (kind === 'patrol') return nodes.filter((node) => node.orbit >= 1) || nodes
  if (kind === 'merchant') return nodes.filter((node) => node.kind !== 'hazard') || nodes
  return nodes
}

function buildNpcShip(rng, system, index) {
  const kind = pickTrafficKindForSystem(rng, system.type)
  const shipClass = rng.pick(Object.keys(SHIP_PRESETS))
  const preset = SHIP_PRESETS[shipClass]
  const combatTemplate = ENEMIES[CONTACT_SHIP_META[kind].enemyKind]
  const anchorPool = preferredNpcNodes(system, kind)
  const node = anchorPool[Math.floor(rng.next() * Math.max(1, anchorPool.length))] || system.nodes[0]
  const namePrefix = kind === 'merchant' ? 'Broker' : kind === 'patrol' ? 'Inspector' : kind === 'pirate' ? 'Raider' : 'Courier'
  return {
    id: createId(`npc_${kind}`),
    kind,
    name: `${randomName(rng)} ${namePrefix}`,
    shipClass,
    currentNodeId: node.id,
    stock: kind === 'merchant' ? buildMerchantStock(rng) : kind === 'civilian' ? buildMerchantStock(rng).slice(0, 3) : undefined,
    shipPrice: preset.value,
    hullMax: combatTemplate.hullMax,
    shieldsMax: combatTemplate.shieldsMax,
    armourMax: combatTemplate.armour,
    speed: Math.max(1, preset.speed + (kind === 'patrol' ? 1 : 0)),
    maneuverability: Math.max(0, preset.maneuverability + (kind === 'civilian' ? 1 : 0)),
    stealth: Math.max(0, preset.stealth + (kind === 'civilian' ? 1 : kind === 'patrol' ? -1 : 0)),
    loadout: combatTemplate.loadout,
  }
}

function buildNpcTraffic(rng, system) {
  const count = system.type === 'Pirate' ? 5 : system.type === 'AI Controlled' ? 5 : system.type === 'Frontier' ? 4 : 3
  return Array.from({ length: count }, (_, index) => buildNpcShip(rng, system, index))
}

function normalizedOrbitSpeed(slotCount, stepShift) {
  return stepShift / Math.max(1, slotCount)
}

function orbitSpeedDifferenceRatio(speedA, speedB) {
  const fastest = Math.max(speedA, speedB)
  if (fastest <= 0) return 1
  return Math.abs(speedA - speedB) / fastest
}

function candidateOrbitStepShifts(slotCount, preferredStep) {
  const candidates = []
  for (let distance = 0; distance < slotCount; distance += 1) {
    const lower = preferredStep - distance
    const upper = preferredStep + distance
    if (lower >= 1) candidates.push(lower)
    if (distance > 0 && upper <= slotCount - 1) candidates.push(upper)
  }
  return candidates
}

function buildOrbitDirections(rng, forcedDominantDirection = null) {
  const dominantDirection = forcedDominantDirection === -1 || forcedDominantDirection === 1 ? forcedDominantDirection : (rng.chance(0.5) ? 1 : -1)
  const orbitDirections = MASTER.slotCounts.map(() => dominantDirection)
  if (rng.chance(REVERSED_ORBIT_CHANCE)) orbitDirections[rng.int(0, MASTER.orbitCount - 1)] = -dominantDirection
  return { dominantDirection, orbitDirections }
}

function buildOrbitStepShifts(rng, preferredSteps = DEFAULT_ORBIT_SPEEDS) {
  const chosenSteps = []
  const chosenSpeeds = []

  for (let orbit = 0; orbit < MASTER.orbitCount; orbit += 1) {
    const slotCount = MASTER.slotCounts[orbit]
    const preferredStep = clamp(Number(preferredSteps?.[orbit]) || DEFAULT_ORBIT_SPEEDS[orbit] || 1, 1, slotCount - 1)
    const orderedCandidates = candidateOrbitStepShifts(slotCount, preferredStep)
    const validCandidates = orderedCandidates.filter((candidateStep) => {
      const speed = normalizedOrbitSpeed(slotCount, candidateStep)
      return chosenSpeeds.every((existingSpeed) => orbitSpeedDifferenceRatio(existingSpeed, speed) >= MIN_ORBIT_SPEED_DIFFERENCE)
    })

    if (validCandidates.length > 0) {
      const pool = validCandidates.slice(0, Math.min(3, validCandidates.length))
      const picked = pool[rng.int(0, pool.length - 1)]
      chosenSteps.push(picked)
      chosenSpeeds.push(normalizedOrbitSpeed(slotCount, picked))
      continue
    }

    const fallback = orderedCandidates.reduce((best, candidateStep) => {
      const speed = normalizedOrbitSpeed(slotCount, candidateStep)
      const gap = chosenSpeeds.length === 0 ? 1 : Math.min(...chosenSpeeds.map((existingSpeed) => orbitSpeedDifferenceRatio(existingSpeed, speed)))
      if (!best || gap > best.gap) return { step: candidateStep, gap }
      return best
    }, null)

    chosenSteps.push(fallback?.step || preferredStep)
    chosenSpeeds.push(normalizedOrbitSpeed(slotCount, fallback?.step || preferredStep))
  }

  return chosenSteps
}

function buildNextPreview(seed, systemNumber) {
  const rng = makeRng(seed)
  const type = rng.pick(SYSTEM_TYPES)
  const system = {
    seed,
    systemNumber,
    name: randomName(rng),
    type,
    transitFuel: rng.int(5, 10),
    threat: rng.pick(['Low', 'Moderate', 'High']),
    note: rng.pick([
      'Long drift lanes and light commerce.',
      'High pirate chatter in the outer rings.',
      'Good repair prospects but unstable hazards.',
      'Dense police presence and tighter routing.',
      'Research beacons detected near the inner rings.',
      'Automated watchers track ship signatures across the lanes.',
    ]),
  }
  return system
}

function buildWaypoint(orbit, slot) {
  return {
    id: `waypoint_${orbit}_${slot}`,
    orbit,
    slot,
    kind: 'empty',
    label: `Empty waypoint O${orbit + 1}-${slot + 1}`,
    description: CONTENT_COPY.empty.description,
    opportunity: CONTENT_COPY.empty.opportunity,
    danger: CONTENT_COPY.empty.danger,
    spent: false,
    stock: undefined,
  }
}

function applyWaypointContent(node, kind, rng, overrides = {}) {
  const copy = CONTENT_COPY[kind] || CONTENT_COPY.empty
  Object.assign(node, {
    kind,
    label: `${KIND_META[kind].label} ${rng.int(1, 99)}`,
    description: copy.description,
    opportunity: copy.opportunity,
    danger: copy.danger,
    spent: false,
    departureIndex: undefined,
    stock: kind === 'merchant' ? buildMerchantStock(rng) : undefined,
  }, overrides)
  return node
}

function pickContactKind(rng, orbit) {
  return rng.pick(orbit >= 3 ? OUTER_CONTACT_POOL : INNER_CONTACT_POOL)
}

function buildSystem(seed, systemNumber, arrivalIndex = null) {
  const rng = makeRng(`${seed}_system_${systemNumber}`)
  const outerSlots = MASTER.slotCounts[MASTER.orbitCount - 1]
  const baseStep = outerSlots / 4
  const systemType = rng.pick(SYSTEM_TYPES)
  const security = SYSTEM_SECURITY[systemType] || SYSTEM_SECURITY.Civilised
  const orbitOffsets = MASTER.slotCounts.map((count) => rng.int(0, count - 1))
  const { dominantDirection, orbitDirections } = buildOrbitDirections(rng)
  const orbitStepShifts = buildOrbitStepShifts(rng)
  const nodes = []
  const nodeMap = new Map()
  const used = new Set()
  const activeArrivalIndex = arrivalIndex ?? rng.int(0, 3)

  const keyFor = (orbit, slot) => `${orbit}:${wrap(slot, MASTER.slotCounts[orbit])}`
  const getNode = (orbit, slot) => nodeMap.get(keyFor(orbit, slot))
  const pickFreeSlot = (orbit) => {
    let slot = rng.int(0, MASTER.slotCounts[orbit] - 1)
    while (used.has(keyFor(orbit, slot))) slot = rng.int(0, MASTER.slotCounts[orbit] - 1)
    return slot
  }
  const occupy = (orbit, slot, kind, overrides = {}) => {
    const actualSlot = wrap(slot, MASTER.slotCounts[orbit])
    const key = keyFor(orbit, actualSlot)
    if (used.has(key)) return null
    used.add(key)
    return applyWaypointContent(getNode(orbit, actualSlot), kind, rng, overrides)
  }

  for (let orbit = 0; orbit < MASTER.orbitCount; orbit += 1) {
    for (let slot = 0; slot < MASTER.slotCounts[orbit]; slot += 1) {
      const node = buildWaypoint(orbit, slot)
      nodes.push(node)
      nodeMap.set(keyFor(orbit, slot), node)
    }
  }

  const departureIndices = [0, 1, 2, 3]
  for (let i = 0; i < 4; i += 1) {
    const slot = i * baseStep
    occupy(MASTER.orbitCount - 1, slot, i === activeArrivalIndex ? 'base_arrival' : 'base_departure', {
      departureIndex: departureIndices[i],
      label: `Cardinal space station D${i + 1}`,
      description: i === activeArrivalIndex
        ? 'This is the Cardinal space station where the ship entered the system. It can repair and prepare the ship, but it cannot be used to leave the system.'
        : 'One of the outer Cardinal space stations. It can repair the ship and launch interstellar travel to its linked next system.',
      opportunity: 'Repair, refuelling, recruitment, and route choice.',
      danger: i === activeArrivalIndex
        ? 'It is locked as the current system arrival point. Move to another Cardinal station to leave the system.'
        : 'Leaving the system consumes fuel from the ship reserves.',
    })
  }

  const beltOrbitCount = 1 + (rng.chance(0.35) ? 1 : 0)
  const beltOrbits = new Set()
  while (beltOrbits.size < beltOrbitCount) beltOrbits.add(rng.int(0, MASTER.orbitCount - 1))

  for (let orbit = 0; orbit < MASTER.orbitCount; orbit += 1) {
    const slot = pickFreeSlot(orbit)
    const kind = beltOrbits.has(orbit) ? 'belt' : 'planet'
    occupy(orbit, slot, kind, {
      label: kind === 'belt' ? `${randomName(rng)} Belt` : randomName(rng),
    })

    if (rng.chance(0.45)) {
      const extraKind = rng.chance(0.25) ? 'belt' : 'planet'
      occupy(orbit, pickFreeSlot(orbit), extraKind, {
        label: extraKind === 'belt' ? `${randomName(rng)} Belt` : randomName(rng),
      })
    }
  }

  for (let orbit = 0; orbit < MASTER.orbitCount; orbit += 1) {
    for (let slot = 0; slot < MASTER.slotCounts[orbit]; slot += 1) {
      if (used.has(keyFor(orbit, slot))) continue
      if (!rng.chance(CONTACT_DENSITY[orbit])) continue
      occupy(orbit, slot, pickContactKind(rng, orbit))
    }
  }

  if (!nodes.some((node) => node.kind === 'shipyard') && rng.chance(0.7)) {
    const shipyardOrbit = rng.int(1, MASTER.orbitCount - 2)
    occupy(shipyardOrbit, pickFreeSlot(shipyardOrbit), 'shipyard', {
      label: `Ship construction station ${rng.int(1, 99)}`,
    })
  }

  const meteorPath = rng.chance(0.55)
    ? {
        angleDeg: rng.int(0, 359),
        width: 12,
        label: 'Interplanetary meteor stream',
        description: 'Meteorites are currently crossing the system on a predictable line. A ship positioned on that line can hitch a ride to another waypoint on the same line.',
      }
    : null

  const system = {
    seed,
    systemNumber,
    name: randomName(rng),
    type: systemType,
    dominantDirection,
    orbitOffsets,
    orbitDirections,
    orbitStepShifts,
    nodes,
    arrivalIndex: activeArrivalIndex,
    policePressure: security.police,
    piratePressure: security.pirates,
    securityAlert: 0,
    crimeCount: 0,
    meteorPath,
    candidatePreviews: systemNumber < MASTER.maxSystems ? [1, 2, 3, 4].map((index) => buildNextPreview(`${seed}_candidate_${systemNumber}_${index}`, systemNumber + 1)) : [],
  }
  system.npcs = buildNpcTraffic(rng, system)
  return system
}

function findNode(system, id) { return system.nodes.find((node) => node.id === id) || system.nodes[0] }
function findNodeByOrbitSlot(system, orbit, slot) {
  return system.nodes.find((node) => node.orbit === orbit && node.slot === wrap(slot, MASTER.slotCounts[orbit])) || system.nodes[0]
}
function circularSlotDistance(slotA, slotB, slotCount) {
  const diff = Math.abs(slotA - slotB)
  return Math.min(diff, slotCount - diff)
}

function slotIntervals(slot, slotCount, offset) {
  const start = wrap(slot + offset, slotCount) / slotCount
  const end = start + (1 / slotCount)
  return end <= 1 ? [[start, end]] : [[start, 1], [0, end - 1]]
}

function intervalsTouch(aIntervals, bIntervals) {
  const epsilon = 1e-9
  return aIntervals.some(([aStart, aEnd]) => bIntervals.some(([bStart, bEnd]) => aEnd >= bStart - epsilon && bEnd >= aStart - epsilon))
}

function segmentsTouch(system, sourceNode, targetNode) {
  const sourceIntervals = slotIntervals(sourceNode.slot, MASTER.slotCounts[sourceNode.orbit], system.orbitOffsets[sourceNode.orbit])
  const targetIntervals = slotIntervals(targetNode.slot, MASTER.slotCounts[targetNode.orbit], system.orbitOffsets[targetNode.orbit])
  return intervalsTouch(sourceIntervals, targetIntervals)
}

function touchingOrbitNodeIds(system, sourceNode, targetOrbit) {
  const ids = []
  for (let slot = 0; slot < MASTER.slotCounts[targetOrbit]; slot += 1) {
    const candidate = findNodeByOrbitSlot(system, targetOrbit, slot)
    if (segmentsTouch(system, sourceNode, candidate)) ids.push(candidate.id)
  }
  return ids
}

function getNeighbourNodeIds(run, node) {
  const ids = new Set()
  ids.add(findNodeByOrbitSlot(run.system, node.orbit, node.slot - 1).id)
  ids.add(findNodeByOrbitSlot(run.system, node.orbit, node.slot + 1).id)
  if (node.orbit > 0) touchingOrbitNodeIds(run.system, node, node.orbit - 1).forEach((id) => ids.add(id))
  if (node.orbit < MASTER.orbitCount - 1) touchingOrbitNodeIds(run.system, node, node.orbit + 1).forEach((id) => ids.add(id))
  return ids
}
function getMaxWaypointHops(run) {
  return run.player.speed >= 5 ? 2 : 1
}
function getReachableNodeIds(run) {
  if (!run || run.screen !== 'map') return new Set()
  const start = findNode(run.system, run.currentNodeId)
  const maxHops = getMaxWaypointHops(run)
  const visited = new Set([start.id])
  let frontier = [start]
  for (let hop = 0; hop < maxHops; hop += 1) {
    const nextFrontier = []
    frontier.forEach((node) => {
      getNeighbourNodeIds(run, node).forEach((id) => {
        if (visited.has(id)) return
        visited.add(id)
        nextFrontier.push(findNode(run.system, id))
      })
    })
    frontier = nextFrontier
  }
  return visited
}

function appendLog(run, text) {
  const next = deepClone(run)
  next.log = [formatLogEntry(next.turn, text), ...(next.log || [])]
  return next
}

function setEventOutcome(run, outcome) {
  const next = deepClone(run)
  next.ui.eventOutcome = { id: createId('event_outcome'), ...outcome }
  return next
}

function outcomeDelta(label, amount) {
  const numeric = Number(amount) || 0
  const sign = numeric >= 0 ? '+' : ''
  return `${String(label).toUpperCase()} ${sign}${numeric}`
}

function outcomeEquipment(name, amount = 1) {
  return `EQUIPMENT +${amount} ${name}`
}

function outcomeStatus(label, text) {
  return `${String(label).toUpperCase()} ${text}`
}

function buildTravelEvent(run, travelMode, currentNodeId, targetNodeId) {
  const rng = makeRng(`${run.seed}_event_${travelMode}_${currentNodeId}_${targetNodeId}_${run.turn}_${run.log.length}`)
  const eventChance = travelMode === 'wait' ? 0.12 : travelMode === 'meteor' ? 0.32 : 0.26
  if (!rng.chance(eventChance * clamp(1 - playerStealthValue(run) * 0.06, 0.55, 1))) return null

  const eventKind = rng.pick(['drifting_cache', 'escape_pod', 'ion_squall', 'salvage_tug'])

  if (eventKind === 'drifting_cache') {
    const scrap = rng.int(4, 8)
    const parts = rng.int(1, 3)
    return {
      id: `event_cache_${run.turn}_${targetNodeId}`,
      kind: eventKind,
      title: 'Random event: drifting cache',
      description: 'A damaged cargo canister spins across your approach lane just before arrival.',
      choices: [
        { id: 'salvage', label: 'Salvage it', note: `Gain ${scrap} scrap and ${parts} parts, but risk debris damage.` },
        { id: 'ignore', label: 'Ignore it', note: 'Stay on course and keep the route stable.' },
      ],
      scrap,
      parts,
    }
  }

  if (eventKind === 'escape_pod') {
    const rescueItemId = rng.pick(['Survey_Drone', 'Shield_Capacitor', 'Fuel_Cask'])
    return {
      id: `event_pod_${run.turn}_${targetNodeId}`,
      kind: eventKind,
      title: 'Random event: escape pod',
      description: 'A single escape pod is tumbling through the lane with a weak beacon still active.',
      choices: [
        { id: 'rescue', label: 'Rescue pod', note: 'Possible survivor or useful equipment.' },
        ...(playerStealthValue(run) >= 4 ? [{ id: 'shadow_scan', label: 'Shadow scan', note: 'Use a low-signature pass to inspect and recover quietly.', requirement: 'Stealth 4' }] : []),
        { id: 'strip', label: 'Strip it', note: 'Take the pod apart for raw materials.' },
        { id: 'leave', label: 'Leave it', note: 'Avoid the delay and preserve your approach vector.' },
      ],
      rescueItemId,
    }
  }

  if (eventKind === 'ion_squall') {
    const shieldBoost = rng.int(6, 12)
    const hullLoss = rng.int(3, 6)
    return {
      id: `event_ion_${run.turn}_${targetNodeId}`,
      kind: eventKind,
      title: 'Random event: ion squall',
      description: 'A brief ion squall rolls through the lane while the ship is still adjusting for arrival.',
      choices: [
        { id: 'brace', label: 'Brace for impact', note: `Reduce risk, but expect up to ${hullLoss} hull damage.` },
        { id: 'siphon', label: 'Siphon the charge', note: `Chance to recover up to ${shieldBoost} shields.` },
      ],
      shieldBoost,
      hullLoss,
    }
  }

  const salvageItemId = rng.pick(['Mining_Laser', 'Armor_Plating', 'Kinetic_I'])
  return {
    id: `event_tug_${run.turn}_${targetNodeId}`,
    kind: 'salvage_tug',
    title: 'Random event: salvage tug',
    description: 'A broken salvage tug drifts across the route with one accessible equipment crate still latched to its frame.',
    choices: [
      { id: 'dock', label: 'Dock and recover', note: `Try to recover the stored ${EQUIPMENT_CATALOG[salvageItemId].name}.` },
      ...(playerStealthValue(run) >= 4 ? [{ id: 'silent_recover', label: 'Silent recover', note: 'Drift in under low signature and avoid drawing attention.', requirement: 'Stealth 4' }] : []),
      { id: 'bypass', label: 'Bypass it', note: 'Keep moving and avoid being pinned to the hulk.' },
    ],
    salvageItemId,
  }
}

function maybeTriggerTravelEvent(run, travelMode, currentNodeId, targetNodeId) {
  if (!run || run.screen !== 'map' || run.pendingEvent) return run
  const event = buildTravelEvent(run, travelMode, currentNodeId, targetNodeId)
  if (!event) return run
  const next = deepClone(run)
  next.pendingEvent = event
  next.log = [formatLogEntry(next.turn, `${event.title} triggered during travel.`), ...(next.log || [])]
  return next
}

function registerCrime(run, description, alertBoost = 1) {
  const next = deepClone(run)
  next.system.securityAlert = (next.system.securityAlert || 0) + alertBoost
  next.system.crimeCount = (next.system.crimeCount || 0) + 1
  if ((next.system.crimeCount || 0) >= 3 || (next.system.securityAlert || 0) >= 4) {
    next.playerWanted = true
    next.playerWantedReason = next.playerWantedReason || 'repeat witnessed crimes'
  }
  next.log = [formatLogEntry(next.turn, `Illegal activity logged: ${description}. Police alert increased.`), ...(next.log || [])]
  return next
}

function buildSecurityEncounter(run, currentNode, targetNode, travelMode) {
  const rng = makeRng(`${run.seed}_security_${run.system.systemNumber}_${run.turn}_${currentNode.id}_${targetNode.id}_${travelMode}_${run.system.securityAlert || 0}_${run.system.crimeCount || 0}`)
  const stealth = playerStealthValue(run)
  const policeChance = adjustDetectionChance((run.system.policePressure || 0) + (run.system.securityAlert || 0) * 0.08 + (run.system.crimeCount || 0) * 0.04, 1, stealth)
  const pirateChance = adjustDetectionChance((run.system.piratePressure || 0) + (targetNode.orbit >= 3 ? 0.06 : 0) + (travelMode === 'meteor' ? 0.05 : 0), 2, stealth)

  if (rng.chance(clamp(policeChance, 0, 0.8))) {
    return {
      kind: 'police_inspection',
      id: `inspection_${run.turn}_${targetNode.id}`,
      title: 'Police detection',
      description: run.system.crimeCount > 0
        ? 'System police tracked your ship after reports of illegal activity and are demanding an inspection.'
        : 'System police have detected your ship and want a routine inspection.',
      choices: [
        { id: 'comply', label: 'Comply', note: 'Submit to inspection and accept the outcome.' },
        { id: 'flee', label: 'Flee', note: 'Refuse the inspection and prepare for combat.' },
      ],
    }
  }

  if (rng.chance(clamp(pirateChance, 0, 0.75))) {
    return { kind: 'pirate_ambush', id: `pirate_${run.turn}_${targetNode.id}` }
  }

  return null
}

function securityRiskForRoute(run, targetNode, travelMode = 'travel') {
  if (!run || !targetNode) return null
  const stealth = playerStealthValue(run)
  const policeChance = adjustDetectionChance(clamp((run.system.policePressure || 0) + (run.system.securityAlert || 0) * 0.08 + (run.system.crimeCount || 0) * 0.04, 0, 0.8), 1, stealth)
  const pirateChance = adjustDetectionChance(clamp((run.system.piratePressure || 0) + (targetNode.orbit >= 3 ? 0.06 : 0) + (travelMode === 'meteor' ? 0.05 : 0), 0, 0.75), 2, stealth)
  return { policeChance, pirateChance }
}

function buildEnemyCombatant(kind, overrides = {}) {
  const template = ENEMIES[kind] || ENEMIES.pirate
  const loadout = Array.isArray(overrides.loadout) && overrides.loadout.length > 0 ? overrides.loadout.filter((weaponId) => WEAPONS[weaponId]) : template.loadout
  return {
    kind,
    name: overrides.name || template.name,
    hullMax: Math.max(1, Number(overrides.hullMax) || template.hullMax),
    hull: Math.max(1, Number(overrides.hull) || Number(overrides.hullMax) || template.hullMax),
    shieldsMax: Math.max(0, Number(overrides.shieldsMax) || template.shieldsMax),
    shields: Math.max(0, Number(overrides.shields) || Number(overrides.shieldsMax) || template.shieldsMax),
    armourMax: Math.max(0, Number(overrides.armourMax ?? overrides.armour) || template.armour),
    armour: Math.max(0, Number(overrides.armour ?? overrides.armourMax) || template.armour),
    speed: Math.max(1, Number(overrides.speed) || template.speed),
    stealth: Math.max(0, Number(overrides.stealth) || template.stealth),
    maneuverability: Math.max(0, Number(overrides.maneuverability) || template.maneuverability),
    weapons: loadout.map((weaponId, index) => buildWeaponInstance(weaponId, index, { ammoLeft: WEAPONS[weaponId]?.ammoType ? 12 : null })),
    crew: Array.isArray(overrides.crew) ? overrides.crew.map((member) => ({ ...member })) : buildEnemyCrew(kind),
    reward: overrides.reward || template.reward,
  }
}

function escapeChanceAgainst(run, enemyKind) {
  const template = ENEMIES[enemyKind]
  if (!template) return 0
  const playerScore = playerSpeedValue(run) * 0.08 + ((run.player.maneuverability || 0) + pilotManeuverBonus(run)) * 0.06 + playerStealthValue(run) * 0.08
  const enemyScore = (template.speed || 0) * 0.08 + (template.maneuverability || 0) * 0.06 + (template.stealth || 0) * 0.05 + (enemyKind === 'patrol' ? 0.08 : 0.02)
  return clamp(0.16 + playerScore - enemyScore, 0.05, 0.84)
}

function contactDetectionChance(run, enemyKind, baseChance) {
  const observerStealth = enemyKind === 'patrol' ? 1 : 2
  return adjustDetectionChance(baseChance, observerStealth, playerStealthValue(run))
}

function tributeDemandCost(run) {
  return {
    scrap: Math.max(5, 8 + (run.system.securityAlert || 0) * 2),
    fuel: 2,
    credits: 0,
  }
}

function enemyTributeOffer(run) {
  const enemy = run?.combatWarning?.enemy || run?.combat?.enemy
  if (!enemy) return { scrap: 0, parts: 0, credits: 0 }
  if (enemy.kind === 'merchant' || enemy.kind === 'civilian') {
    return {
      scrap: Math.max(0, Math.floor((enemy.reward?.scrap || 0) * 0.25)),
      parts: Math.max(0, Math.floor((enemy.reward?.parts || 0) * 0.35)),
      credits: Math.max(10, Math.round((enemy.reward?.scrap || 6) * 1.8)),
    }
  }
  return {
    scrap: Math.max(4, Math.round((enemy.reward?.scrap || 8) * 0.6)),
    parts: Math.max(0, Math.floor((enemy.reward?.parts || 0) * 0.3)),
    credits: Math.max(0, Math.round((enemy.reward?.parts || 0) * 2)),
  }
}

function tributeSummary(cost) {
  return [
    cost.credits > 0 ? `${cost.credits} credits` : null,
    cost.scrap > 0 ? `${cost.scrap} scrap` : null,
    cost.parts > 0 ? `${cost.parts} parts` : null,
    cost.fuel > 0 ? `${cost.fuel} fuel` : null,
  ].filter(Boolean).join(' + ')
}

function playerCanPayTribute(run, cost) {
  return (run.resources.scrap || 0) >= (cost.scrap || 0)
    && (run.resources.parts || 0) >= (cost.parts || 0)
    && (run.resources.credits || 0) >= (cost.credits || 0)
    && totalFuelAvailable(run) >= (cost.fuel || 0)
}

function completePoliceInspection(run) {
  const next = deepClone(run)
  const wantedCrew = (next.crew || []).filter((member) => crewHasWantedStatus(member))
  const details = []
  let logBits = []
  let totalFine = 0
  let confiscatedFuel = 0

  if (next.playerWanted) {
    const playerFine = Math.min(next.resources.scrap, 8 + (next.system.crimeCount || 0) * 4)
    totalFine += playerFine
    next.resources.scrap -= playerFine
    details.push(outcomeDelta('scrap', -playerFine))
    details.push(outcomeStatus('wanted', 'PLAYER FLAG CONFIRMED'))
    logBits.push('the ship AI was flagged by police records')
  }

  if ((next.system.crimeCount || 0) > 0) {
    const crimeFine = Math.min(next.resources.scrap, 4 + next.system.crimeCount * 4 + next.system.securityAlert * 2)
    totalFine += crimeFine
    next.resources.scrap -= crimeFine
    confiscatedFuel = Math.min(totalFuelAvailable(next), Math.max(1, next.system.crimeCount))
    spendFuel(next, confiscatedFuel)
    if (crimeFine > 0) details.push(outcomeDelta('scrap', -crimeFine))
    details.push(outcomeDelta('fuel', -confiscatedFuel))
    logBits.push('recorded system crimes were cited')
  }

  if (wantedCrew.length > 0) {
    next.crew = next.crew.filter((member) => !crewHasWantedStatus(member))
    syncSelectedCrew(next)
    details.push(outcomeStatus('crew arrested', wantedCrew.map((member) => member.name).join(', ')))
    logBits.push(`${wantedCrew.length} wanted crew were arrested`)
  }

  if (next.cargo.length > 0 && (wantedCrew.length > 0 || next.playerWanted || (next.system.crimeCount || 0) > 0)) {
    const seized = next.cargo.shift()
    next.ui.selectedCargoItemId = buildCargoGridEntries(next)[0]?.key || null
    details.push(outcomeStatus('equipment seized', EQUIPMENT_CATALOG[seized.itemId]?.name || 'Cargo'))
    logBits.push(`${EQUIPMENT_CATALOG[seized.itemId]?.name || 'cargo'} was seized`)
  }

  next.system.securityAlert = Math.max(0, (next.system.securityAlert || 0) - 2)
  next.system.crimeCount = 0
  next.playerWanted = false
  next.playerWantedReason = null

  if (wantedCrew.length === 0 && totalFine === 0 && confiscatedFuel === 0 && details.length === 0) {
    return setEventOutcome(
      appendLog(next, 'Police inspection completed. The ship was cleared to continue.'),
      { title: 'Inspection complete', text: 'The ship passed the inspection and was cleared to continue.', tone: 'green', details: [outcomeStatus('result', 'CLEARED')] },
    )
  }

  return setEventOutcome(
    appendLog(next, `Police inspection completed: ${logBits.join('; ')}.`),
    {
      title: 'Inspection enforced',
      text: 'Authorities completed their inspection and imposed penalties before releasing the ship.',
      tone: 'rose',
      details: details.length > 0 ? details : [outcomeStatus('result', 'PENALTIES APPLIED')],
    },
  )
}

function queueCombatEncounter(run, enemyKind, title, description, logText = null, options = {}) {
  const next = deepClone(run)
  next.screen = 'combat_warning'
  next.combatWarning = {
    id: createId(`combat_warning_${enemyKind}`),
    enemyKind,
    enemy: options.enemy || buildEnemyCombatant(enemyKind, options.enemyOverrides || {}),
    title,
    description,
    escapeChance: escapeChanceAgainst(next, enemyKind),
    demandChoices: Array.isArray(options.demandChoices) ? options.demandChoices : [],
    sourceNpcId: options.sourceNpcId || null,
  }
  next.pendingEvent = null
  if (logText) next.log = [formatLogEntry(next.turn, logText), ...(next.log || [])]
  return next
}

function maybeTriggerSecurityEncounter(run, currentNodeId, targetNodeId, travelMode) {
  if (!run || run.screen !== 'map' || run.pendingEvent) return run
  const currentNode = findNode(run.system, currentNodeId)
  const targetNode = findNode(run.system, targetNodeId)
  const encounter = buildSecurityEncounter(run, currentNode, targetNode, travelMode)
  if (!encounter) return run
  if (encounter.kind === 'police_inspection') {
    return queueCombatEncounter(
      run,
      'patrol',
      'Police inspection',
      encounter.description,
      `${encounter.title}: police moved to hold your ship for inspection.`,
      {
        demandChoices: [{ id: 'allow_inspection', label: 'Allow inspection', note: 'Submit to the police boarding and inspection request.' }],
      },
    )
  }
  if (encounter.kind === 'pirate_ambush') {
    return queueCombatEncounter(
      run,
      'pirate',
      'Pirate interception',
      'Pirates have moved to intercept your ship and are closing for combat.',
      'Pirates detected the ship and moved to intercept.',
      {
        demandChoices: [{ id: 'pay_tribute', label: 'Offer tribute', note: 'Hand over scrap and fuel in exchange for being left alone.' }],
      },
    )
  }

  const next = deepClone(run)
  next.pendingEvent = encounter
  next.log = [formatLogEntry(next.turn, `${encounter.title}: the ship has been intercepted.`), ...(next.log || [])]
  return next
}

function npcEnemyOverrides(npc) {
  return {
    name: npc.name,
    speed: npc.speed,
    maneuverability: npc.maneuverability,
    stealth: npc.stealth,
    loadout: npc.loadout,
  }
}

function npcEscapeChanceAgainstPlayer(run, npc) {
  const playerScore = playerSpeedValue(run) * 0.08 + ((run.player.maneuverability || 0) + pilotManeuverBonus(run)) * 0.06 + playerStealthValue(run) * 0.08
  const npcScore = (npc.speed || 0) * 0.08 + (npc.maneuverability || 0) * 0.06 + (npc.stealth || 0) * 0.08
  return clamp(0.18 + npcScore - playerScore, 0.05, 0.86)
}

function queueNpcCombat(run, npc, title, description, logText = null, demandChoices = []) {
  return queueCombatEncounter(
    run,
    CONTACT_SHIP_META[npc.kind]?.enemyKind || 'civilian',
    title,
    description,
    logText,
    {
      enemyOverrides: npcEnemyOverrides(npc),
      sourceNpcId: npc.id,
      demandChoices,
    },
  )
}

function openMerchantExchange(run, sourceId, type = 'node') {
  const next = deepClone(run)
  next.ui.merchantOpen = true
  next.ui.merchantTab = 'buy'
  next.ui.merchantContext = { type, id: sourceId }
  if (type === 'npc') next.ui.selectedNpcId = sourceId
  return next
}

function hailNpcShip(run, npcId) {
  const next = deepClone(run)
  const npc = findNpcShip(next.system, npcId)
  if (!npc) return next
  next.pendingEvent = {
    id: createId(`hail_${npc.kind}`),
    kind: 'npc_hail',
    npcId,
    title: `${npc.name} answered your hail`,
    description: npc.kind === 'patrol'
      ? 'The police ship responded and ordered your ship to hold position for inspection.'
      : npc.kind === 'merchant'
        ? 'The merchant ship opened a trade channel and sounded willing to negotiate.'
        : npc.kind === 'civilian'
          ? 'The civilian ship answered on a narrow-band civilian frequency.'
          : 'The hostile ship answered with a jagged burst of static and threat codes.',
    choices: npc.kind === 'patrol'
      ? [
          { id: 'trade', label: 'Acknowledge', note: 'Hear their demand.' },
          { id: 'close', label: 'Close channel', note: 'End the transmission.' },
        ]
      : [
          { id: 'trade', label: 'Ask to trade', note: 'Request a trade exchange if they are willing.' },
        { id: 'buy_ship', label: 'Ask to buy ship', note: 'Ask whether their hull is for sale.' },
          { id: 'close', label: 'Close channel', note: 'Break contact without escalating.' },
        ],
  }
  return next
}

function attackNpcShip(run, npcId, reason = 'Opened fire on a passing ship.') {
  const next = deepClone(run)
  const npc = findNpcShip(next.system, npcId)
  if (!npc) return next
  const rng = makeRng(`${next.seed}_attack_npc_${npc.id}_${next.turn}`)
  if (rng.chance(npcEscapeChanceAgainstPlayer(next, npc))) {
    const currentNode = findNode(next.system, npc.currentNodeId)
    const neighbourIds = [...getNeighbourNodeIds(next, currentNode)]
    const fallbackId = neighbourIds.length > 0 ? neighbourIds[rng.int(0, neighbourIds.length - 1)] : currentNode.id
    npc.currentNodeId = fallbackId
    return setEventOutcome(
      appendLog(next, `${npc.name} evaded your opening attack and burned out of range.`),
      { title: 'Target escaped', text: 'The other ship reacted fast enough to avoid an engagement.', tone: 'amber', details: [outcomeStatus('flee', 'TARGET ESCAPED')] },
    )
  }
  return queueNpcCombat(next, npc, `${npc.name} under attack`, `${npc.name} failed to escape and is turning to fight.`, reason)
}

function buildTransitNpcEncounter(run, npc) {
  const rng = makeRng(`${run.seed}_npc_contact_${npc.id}_${run.turn}`)
  if (npc.kind === 'patrol') {
    return queueNpcCombat(
      run,
      npc,
      'Police interception',
      `${npc.name} ordered your ship to hold for inspection.`,
      `${npc.name} cut across your route and demanded inspection.`,
      [{ id: 'allow_inspection', label: 'Allow inspection', note: 'Submit to the boarding demand and stay out of combat.' }],
    )
  }
  if (npc.kind === 'pirate') {
    const roll = rng.next()
    if (roll < 0.52) {
      return queueNpcCombat(
        run,
        npc,
        'Pirate interception',
        `${npc.name} crossed your path and opened a hostile channel.`,
        `${npc.name} moved in to attack.`,
        [{ id: 'pay_tribute', label: 'Offer tribute', note: 'Throw fuel and scrap at the problem and hope they accept.' }],
      )
    }
    if (roll < 0.72) {
      return setEventOutcome(
        appendLog(run, `${npc.name} crossed your route but failed to commit to an attack.`),
        { title: 'Hostile contact passed by', text: 'The pirate ship kept pace for a moment, then drifted off without closing.', tone: 'slate', details: [outcomeStatus('result', 'NO ENGAGEMENT')] },
      )
    }
    if (roll < 0.86) {
      const next = deepClone(run)
      next.pendingEvent = {
        id: createId('npc_trade_offer'),
        kind: 'npc_trade_offer',
        npcId: npc.id,
        ambush: true,
        title: `Incoming trade request from ${npc.name}`,
        description: 'The contact claims to be interested in trade, but the traffic pattern looks wrong.',
        choices: [
          { id: 'accept', label: 'Accept trade request', note: 'Open the channel and see whether it is genuine.' },
          { id: 'ignore', label: 'Ignore', note: 'Stay quiet and keep moving.' },
          { id: 'attack', label: 'Attack', note: 'Open fire before they get the jump on you.' },
        ],
      }
      return next
    }
    const next = deepClone(run)
    next.pendingEvent = {
      id: createId('npc_distress'),
      kind: 'npc_distress',
      npcId: npc.id,
      ambush: true,
      genuine: false,
      rewardScrap: 0,
      rewardParts: 0,
      title: `Distress call from ${npc.name}`,
      description: 'The contact broadcasts a distressed merchant code, but the signal is inconsistent.',
      choices: [
        { id: 'answer', label: 'Answer distress call', note: 'Approach and see whether the call is genuine.' },
        { id: 'ignore', label: 'Ignore', note: 'Leave the signal unanswered.' },
        { id: 'attack', label: 'Attack', note: 'Treat the signal as bait and strike first.' },
      ],
    }
    return next
  }
  if (npc.kind === 'merchant' || npc.kind === 'civilian') {
    const next = deepClone(run)
    next.pendingEvent = {
      id: createId('npc_trade_offer'),
      kind: 'npc_trade_offer',
      npcId: npc.id,
      ambush: false,
      title: npc.kind === 'merchant' ? `Trade request from ${npc.name}` : `Open channel from ${npc.name}`,
      description: npc.kind === 'merchant'
        ? 'A merchant ship is offering a quick exchange while the routes overlap.'
        : 'The other ship is open to a short civilian exchange before the orbits separate.',
      choices: [
        { id: 'accept', label: 'Accept channel', note: 'Open communications and discuss trade.' },
        { id: 'ignore', label: 'Ignore', note: 'Keep your vector and let the ship pass.' },
        { id: 'attack', label: 'Attack', note: 'Break the contact by force if they cannot run.' },
      ],
    }
    return next
  }
  return run
}

function advanceNpcTraffic(run, playerFromNodeId, playerToNodeId) {
  if (!run?.system?.npcs?.length || run.pendingEvent || run.screen !== 'map') return run
  const next = deepClone(run)
  let encounterNpc = null
  next.system.npcs = next.system.npcs.map((npc, index) => {
    const rng = makeRng(`${next.seed}_npc_move_${next.turn}_${npc.id}_${index}`)
    const currentNode = findNode(next.system, npc.currentNodeId)
    const neighbours = [...getNeighbourNodeIds(next, currentNode)].map((id) => findNode(next.system, id))
    const options = [currentNode, ...neighbours]
    let destination = options[rng.int(0, Math.max(0, options.length - 1))]
    if (currentNode.kind === 'base_departure' && rng.chance(0.18)) {
      destination = preferredNpcNodes(next.system, npc.kind)[rng.int(0, Math.max(0, preferredNpcNodes(next.system, npc.kind).length - 1))] || currentNode
    }
    const movedNpc = { ...npc, currentNodeId: destination.id }
    const crossed = npc.currentNodeId === playerToNodeId
      || destination.id === playerToNodeId
      || (npc.currentNodeId === playerFromNodeId && destination.id === playerToNodeId)
      || (npc.currentNodeId === playerToNodeId && destination.id === playerFromNodeId)
    if (!encounterNpc && crossed) encounterNpc = movedNpc
    return movedNpc
  })
  if (!encounterNpc) return next
  return buildTransitNpcEncounter(next, encounterNpc)
}

function resolvePendingEvent(run, choiceId) {
  if (!run?.pendingEvent) return run
  const next = deepClone(run)
  const event = next.pendingEvent
  const rng = makeRng(`${event.id}_${choiceId}_${next.seed}`)
  next.pendingEvent = null

  if (event.kind === 'npc_trade_offer') {
    const npc = findNpcShip(next.system, event.npcId)
    if (!npc) return next
    if (choiceId === 'attack') return attackNpcShip(next, npc.id, `Attacked ${npc.name} after an open-channel contact.`)
    if (choiceId === 'ignore') {
      return setEventOutcome(
        appendLog(next, `Ignored the channel request from ${npc.name}.`),
        { title: 'Contact ignored', text: 'The ship drifted on without forcing the issue.', tone: 'slate', details: [outcomeStatus('result', 'NO ENGAGEMENT')] },
      )
    }
    if (event.ambush) {
      return queueNpcCombat(
        next,
        { ...npc, kind: 'pirate' },
        `${npc.name} sprung an ambush`,
        'The channel was bait. Weapons lit up the moment you responded.',
        `${npc.name} used the channel request as an ambush.`,
        [{ id: 'pay_tribute', label: 'Offer tribute', note: 'Throw resources at the pirate ship and hope it disengages.' }],
      )
    }
    return openMerchantExchange(appendLog(next, `${npc.name} opened a trade exchange.`), npc.id, 'npc')
  }

  if (event.kind === 'npc_distress') {
    const npc = findNpcShip(next.system, event.npcId)
    if (!npc) return next
    if (choiceId === 'attack') return attackNpcShip(next, npc.id, `Attacked ${npc.name} after a distress transmission.`)
    if (choiceId === 'ignore') {
      return setEventOutcome(
        appendLog(next, `Ignored the distress signal from ${npc.name}.`),
        { title: 'Distress call ignored', text: 'You kept your course and left the signal behind.', tone: 'slate', details: [outcomeStatus('result', 'NO ENGAGEMENT')] },
      )
    }
    if (event.ambush || event.genuine === false) {
      return queueNpcCombat(
        next,
        { ...npc, kind: 'pirate' },
        `${npc.name} sprung an ambush`,
        'The distress call was bait. The contact cut in hard and opened fire.',
        `${npc.name} used a distress call to stage an ambush.`,
        [{ id: 'pay_tribute', label: 'Offer tribute', note: 'Try to buy them off before the first exchange.' }],
      )
    }
    next.resources.scrap += event.rewardScrap || 0
    next.resources.parts += event.rewardParts || 0
    return setEventOutcome(
      appendLog(next, `Answered the distress call from ${npc.name} and recovered emergency stores.`),
      {
        title: 'Distress call answered',
        text: 'The ship truly needed help and transferred whatever spare stores it could spare.',
        tone: 'green',
        details: [outcomeDelta('scrap', event.rewardScrap || 0), outcomeDelta('parts', event.rewardParts || 0)],
      },
    )
  }

  if (event.kind === 'npc_hail') {
    const npc = findNpcShip(next.system, event.npcId)
    if (!npc) return next
    if (choiceId === 'close') {
      return setEventOutcome(
        appendLog(next, `Closed the hail channel with ${npc.name}.`),
        { title: 'Channel closed', text: 'No further terms were exchanged.', tone: 'slate', details: [outcomeStatus('result', 'NO CHANGE')] },
      )
    }
    if (choiceId === 'buy_ship') {
      return setEventOutcome(
        appendLog(next, `${npc.name} quoted ${npc.shipPrice} credits for the ${npc.shipClass}, but no sale closed.`),
        {
          title: 'Ship purchase quote',
          text: 'The captain named a price, but the negotiation ended before a transfer was agreed.',
          tone: 'amber',
          details: [
            outcomeStatus('what', npc.shipClass),
            outcomeStatus('price per unit', `${npc.shipPrice} CREDITS`),
            outcomeStatus('stock', '1'),
          ],
        },
      )
    }
    if (npc.kind === 'patrol') {
      return queueNpcCombat(
        next,
        npc,
        'Police inspection demand',
        `${npc.name} repeated the demand that your ship submit to inspection.`,
        `${npc.name} demanded inspection over the open channel.`,
        [{ id: 'allow_inspection', label: 'Allow inspection', note: 'Comply with the demand and avoid combat.' }],
      )
    }
    if (npc.kind === 'pirate' && rng.chance(0.55)) {
      return queueNpcCombat(
        next,
        { ...npc, kind: 'pirate' },
        'Pirate deception',
        `${npc.name} dropped the pretense and began a weapons lock.`,
        `${npc.name} turned a hail reply into a pirate attack.`,
        [{ id: 'pay_tribute', label: 'Offer tribute', note: 'Throw resources at the pirate ship and hope it disengages.' }],
      )
    }
    return openMerchantExchange(appendLog(next, `${npc.name} is open to trade.`), npc.id, 'npc')
  }

  if (event.kind === 'combat_prompt') {
    return queueCombatEncounter(next, event.enemyKind, event.title || 'Combat warning', event.description || 'Hostile ships are closing.')
  }

  if (event.kind === 'drifting_cache') {
    if (choiceId === 'salvage') {
      const scrapGain = scaleScrapGain(event.scrap, scrapperBonus(next, 'event_salvage'))
      next.resources.scrap += scrapGain
      next.resources.parts += event.parts
      if (rng.chance(0.35)) {
        next.player.hull = Math.max(1, next.player.hull - 4)
        return setEventOutcome(
          appendLog(next, `Recovered ${scrapGain} scrap and ${event.parts} parts from the drifting cache, but loose debris damaged the hull (-4).`),
          { title: 'Drifting cache recovered', text: 'The cache yielded useful salvage, but the recovery was messy.', tone: 'amber', details: [outcomeDelta('scrap', scrapGain), outcomeDelta('parts', event.parts), outcomeDelta('hull', -4)] },
        )
      }
      return setEventOutcome(
        appendLog(next, `Recovered ${scrapGain} scrap and ${event.parts} parts from the drifting cache.`),
        { title: 'Drifting cache recovered', text: 'The cargo canister was secured cleanly.', tone: 'amber', details: [outcomeDelta('scrap', scrapGain), outcomeDelta('parts', event.parts)] },
      )
    }
    return setEventOutcome(
      appendLog(next, 'Ignored the drifting cache and stayed on course.'),
      { title: 'Cache ignored', text: 'You held the route and left the drifting cargo behind.', tone: 'slate', details: [outcomeStatus('result', 'NO GAIN')] },
    )
  }

  if (event.kind === 'escape_pod') {
    if (choiceId === 'rescue') {
      if (rng.chance(0.6)) {
        if (crewAtCapacity(next)) {
          next.resources.parts += 4
          return setEventOutcome(
            appendLog(next, 'A living survivor was found in the escape pod, but no berth was available. Emergency supplies were transferred instead.'),
            { title: 'Escape pod recovered', text: 'The survivor could not be taken aboard because the ship was already at crew capacity.', tone: 'amber', details: [outcomeStatus('crew', 'CAPACITY REACHED'), outcomeDelta('parts', 4)] },
          )
        }
        next.crew.push(buildCrew(rng, false))
        syncSelectedCrew(next)
        return setEventOutcome(
          appendLog(next, 'Recovered a survivor from the escape pod.'),
          { title: 'Escape pod rescued', text: 'A living survivor was brought aboard.', tone: 'cyan', details: [outcomeDelta('crew', 1)] },
        )
      }
      if (cargoFree(next) > 0) {
        const cargoItem = buildCargoItem(event.rescueItemId)
        next.cargo.push(cargoItem)
        next.ui.selectedCargoItemId = cargoItem.id
        return setEventOutcome(
          appendLog(next, `The pod contained stored equipment: ${EQUIPMENT_CATALOG[event.rescueItemId].name}.`),
          { title: 'Escape pod recovered', text: 'No survivor remained, but the pod still carried useful gear.', tone: 'cyan', details: [outcomeEquipment(EQUIPMENT_CATALOG[event.rescueItemId].name)] },
        )
      }
      next.resources.parts += 4
      return setEventOutcome(
        appendLog(next, 'The pod held no survivor, but some useful components were recovered.'),
        { title: 'Escape pod stripped for parts', text: 'The pod was empty, but its systems were still worth salvaging.', tone: 'cyan', details: [outcomeDelta('parts', 4)] },
      )
    }
    if (choiceId === 'shadow_scan') {
      if (cargoFree(next) > 0) {
        const cargoItem = buildCargoItem(event.rescueItemId)
        next.cargo.push(cargoItem)
        next.ui.selectedCargoItemId = cargoItem.id
        awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'pilot') > 0)
        return setEventOutcome(
          appendLog(next, `A stealth pass recovered ${EQUIPMENT_CATALOG[event.rescueItemId].name} from the escape pod without being tracked.`),
          { title: 'Shadow scan complete', text: 'The pod was inspected and recovered quietly under the ship stealth screen.', tone: 'green', details: [outcomeEquipment(EQUIPMENT_CATALOG[event.rescueItemId].name), outcomeStatus('stealth', 'USED')] },
        )
      }
      next.resources.parts += 4
      return setEventOutcome(
        appendLog(next, 'A stealth scan found only components worth taking from the pod.'),
        { title: 'Shadow scan complete', text: 'Cargo space was too tight for equipment, but the quiet pass still recovered components.', tone: 'green', details: [outcomeDelta('parts', 4), outcomeStatus('stealth', 'USED')] },
      )
    }
    if (choiceId === 'strip') {
      const scrapGain = scaleScrapGain(5, scrapperBonus(next, 'event_salvage'))
      next.resources.scrap += scrapGain
      next.resources.parts += 3
      return setEventOutcome(
        appendLog(registerCrime(next, 'escape pod stripping', 1), 'Stripped the escape pod for materials and moved on.'),
        { title: 'Escape pod stripped', text: 'The pod was dismantled for raw materials. Local authorities may care.', tone: 'rose', details: [outcomeDelta('scrap', scrapGain), outcomeDelta('parts', 3), outcomeDelta('police alert', 1)] },
      )
    }
    return setEventOutcome(
      appendLog(next, 'Left the escape pod untouched.'),
      { title: 'Escape pod left behind', text: 'You preserved your approach vector and moved on.', tone: 'slate', details: [outcomeStatus('result', 'NO GAIN')] },
    )
  }

  if (event.kind === 'ion_squall') {
    if (choiceId === 'siphon') {
      if (rng.chance(0.55)) {
        next.player.shields = Math.min(next.player.shieldsMax, next.player.shields + event.shieldBoost)
        return setEventOutcome(
          appendLog(next, `Siphoned the ion squall and restored ${event.shieldBoost} shields.`),
          { title: 'Ion siphon successful', text: 'The squall was converted into shield charge.', tone: 'cyan', details: [outcomeDelta('shields', event.shieldBoost)] },
        )
      }
      next.player.hull = Math.max(1, next.player.hull - event.hullLoss)
      return setEventOutcome(
        appendLog(next, `The ion squall overloaded the hull grid. Hull -${event.hullLoss}.`),
        { title: 'Ion siphon failed', text: 'The charge arced across the hull instead of the shield lattice.', tone: 'rose', details: [outcomeDelta('hull', -event.hullLoss)] },
      )
    }
    const reducedLoss = Math.max(1, event.hullLoss - 2)
    next.player.hull = Math.max(1, next.player.hull - reducedLoss)
    return setEventOutcome(
      appendLog(next, `Braced through the ion squall. Hull -${reducedLoss}.`),
      { title: 'Ion squall weathered', text: 'The ship rode out the interference with limited damage.', tone: 'amber', details: [outcomeDelta('hull', -reducedLoss)] },
    )
  }

  if (choiceId === 'silent_recover') {
    if (cargoFree(next) > 0) {
      const cargoItem = buildCargoItem(event.salvageItemId)
      next.cargo.push(cargoItem)
      next.ui.selectedCargoItemId = cargoItem.id
      awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'pilot') > 0)
      return setEventOutcome(
        appendLog(next, `Recovered ${EQUIPMENT_CATALOG[event.salvageItemId].name} from the salvage tug without attracting notice.`),
        { title: 'Silent recovery successful', text: 'The crate was taken under a low-signature approach and no legal trace was left.', tone: 'green', details: [outcomeEquipment(EQUIPMENT_CATALOG[event.salvageItemId].name), outcomeStatus('stealth', 'USED')] },
      )
    }
    const scrapGain = scaleScrapGain(6, scrapperBonus(next, 'event_salvage'))
    next.resources.scrap += scrapGain
    return setEventOutcome(
      appendLog(next, 'A stealth recovery pass stripped scrap from the tug when there was no room for the crate.'),
      { title: 'Silent recovery partial', text: 'The approach stayed quiet, but only raw salvage could be carried away.', tone: 'green', details: [outcomeDelta('scrap', scrapGain), outcomeStatus('stealth', 'USED')] },
    )
  }

  if (choiceId === 'dock') {
    if (cargoFree(next) > 0) {
      const cargoItem = buildCargoItem(event.salvageItemId)
      next.cargo.push(cargoItem)
      next.ui.selectedCargoItemId = cargoItem.id
      return setEventOutcome(
        appendLog(registerCrime(next, 'unauthorised salvage tug recovery', 1), `Recovered ${EQUIPMENT_CATALOG[event.salvageItemId].name} from the salvage tug.`),
        { title: 'Salvage tug boarded', text: 'The crate was recovered, but the operation was not legal.', tone: 'rose', details: [outcomeEquipment(EQUIPMENT_CATALOG[event.salvageItemId].name), outcomeDelta('police alert', 1)] },
      )
    }
    const scrapGain = scaleScrapGain(6, scrapperBonus(next, 'event_salvage'))
    next.resources.scrap += scrapGain
    return setEventOutcome(
      appendLog(registerCrime(next, 'salvage tug stripping', 1), 'The equipment crate could not be stowed, so the tug was stripped for scrap instead.'),
      { title: 'Salvage tug stripped', text: 'Cargo space was too tight, so only raw material was taken.', tone: 'rose', details: [outcomeDelta('scrap', scrapGain), outcomeDelta('police alert', 1)] },
    )
  }

  if (event.kind === 'police_inspection') {
    if (choiceId === 'flee') {
      const escalated = registerCrime(next, 'flight from police inspection', 2)
      return queueCombatEncounter(
        escalated,
        'patrol',
        'Police pursuit',
        'You refused inspection. Police interceptors are moving in to force compliance.',
        'Flight from inspection escalated into an armed police pursuit.',
      )
    }

    return completePoliceInspection(next)
  }

  return setEventOutcome(
    appendLog(next, 'Bypassed the drifting salvage tug.'),
    { title: 'Salvage tug bypassed', text: 'You stayed clear of the drifting tug and maintained course.', tone: 'slate', details: [outcomeStatus('result', 'NO GAIN')] },
  )
}

function applyDamage(target, amount, shieldPen, armour) {
  let remaining = amount
  const bypass = Math.round(amount * shieldPen)
  remaining -= bypass
  let shields = target.shields
  let hull = target.hull
  if (bypass > 0) hull -= Math.max(1, bypass - armour)
  if (remaining > 0 && shields > 0) {
    const absorbed = Math.min(shields, remaining)
    shields -= absorbed
    remaining -= absorbed
  }
  if (remaining > 0) hull -= Math.max(1, remaining - armour)
  return { ...target, shields: Math.max(0, shields), hull: Math.max(0, hull) }
}

function weaponVisualMeta(weaponId) {
  if (weaponId === 'Missile_I') return { kind: 'missile', colour: '#fb923c', durationMs: 920 }
  if (weaponId === 'Kinetic_I') return { kind: 'kinetic', colour: '#e2e8f0', durationMs: 440 }
  if (weaponId === 'Mining_Laser') return { kind: 'mining', colour: '#a78bfa', durationMs: 520 }
  return { kind: 'laser', colour: '#f87171', durationMs: 360 }
}

function createCombatShot(weapon, from, hit, laneIndex, startedAt) {
  const meta = weaponVisualMeta(weapon.id)
  return {
    id: createId('shot'),
    weaponId: weapon.id,
    kind: meta.kind,
    colour: meta.colour,
    from,
    hit,
    laneIndex,
    startedAt,
    durationMs: meta.durationMs,
  }
}

function combatShieldCapacity(entity, systems) {
  return Math.max(0, (entity?.shieldsMax || 0) - Math.max(0, Number(systems?.shieldLayersDisabled) || 0) * 6)
}

function effectiveCombatShields(entity, systems) {
  return clamp(Number(entity?.shields) || 0, 0, combatShieldCapacity(entity, systems))
}

function combatEnginePenalty(systems) {
  return Math.floor(Math.max(0, Number(systems?.engineDamage) || 0) / 5)
}

function playerWeaponSpecialistBonus(run, perkId) {
  return (run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).reduce((sum, member) => sum + crewPerkLevel(member, 'weapon_specialist', perkId), 0)
}

function playerRepairCapacity(run) {
  return (run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).reduce((sum, member) => {
    const repairSkill = crewSkillLevel(member, 'repair_specialist')
    const weaponRepairSkill = crewPerkLevel(member, 'weapon_specialist', 'combat_repairs')
    if (repairSkill > 0) return sum + Math.max(1, crewPerkLevel(member, 'repair_specialist', 'multitasking'))
    if (weaponRepairSkill > 0) return sum + 1
    return sum
  }, 0)
}

function playerRepairRate(run) {
  return (run?.crew || []).filter((member) => (member.health ?? member.healthMax ?? 1) > 0).reduce((sum, member) => {
    const repairSkill = crewPerkLevel(member, 'repair_specialist', 'repair_speed')
    const weaponRepairSkill = crewPerkLevel(member, 'weapon_specialist', 'combat_repairs')
    return sum + repairSkill * 1.1 + weaponRepairSkill * 0.45
  }, 0)
}

function weaponRateMultiplier(run, isPlayerSide) {
  if (!isPlayerSide) return 1
  return 1 + playerWeaponSpecialistBonus(run, 'rate_of_fire') * 0.08
}

function weaponDamageMultiplier(run, isPlayerSide) {
  if (!isPlayerSide) return 1
  return 1 + playerWeaponSpecialistBonus(run, 'damage') * 0.06
}

function effectiveWeaponCooldownMs(weapon, run, isPlayerSide) {
  if (!weapon || weapon.broken || (weapon.hp ?? 0) <= 0) return Number.POSITIVE_INFINITY
  const hpRatio = weaponHpRatio(weapon)
  if (hpRatio <= 0) return Number.POSITIVE_INFINITY
  const fireRateMultiplier = weaponRateMultiplier(run, isPlayerSide)
  const baseCooldownMs = (weapon.baseCooldown || weapon.cooldown || 1) * 1000
  return baseCooldownMs / Math.max(0.05, hpRatio * fireRateMultiplier)
}

function effectiveCombatManeuverability(entity, systems, extraBonus = 0) {
  return Math.max(0, (entity?.maneuverability || 0) + extraBonus - combatEnginePenalty(systems))
}

function applyShieldSystemDamage(entity, systems, damage) {
  const layerLoss = Math.max(1, Math.round(damage / 8))
  const nextSystems = {
    ...(systems || {}),
    shieldLayersDisabled: clamp((systems?.shieldLayersDisabled || 0) + layerLoss, 0, shieldLayerCount(entity)),
  }
  const shieldCap = combatShieldCapacity(entity, nextSystems)
  return {
    entity: { ...entity, shields: clamp(entity.shields, 0, shieldCap) },
    systems: nextSystems,
    detail: `SHIELD LAYERS -${layerLoss}`,
  }
}

function applyEngineDamage(entity, systems, damage) {
  const engineDamage = Math.max(1, Math.round(damage * 0.7))
  return {
    entity: { ...entity },
    systems: {
      ...(systems || {}),
      engineDamage: Math.max(0, (systems?.engineDamage || 0) + engineDamage),
    },
    detail: `ENGINES -${engineDamage}`,
  }
}

function applyWeaponSystemDamage(weapons, damage, targetInstanceId = null) {
  const viable = (weapons || []).map((weapon, index) => ({ weapon, index })).filter(({ weapon }) => weapon)
  if (viable.length === 0) return { weapons, detail: 'WEAPON SYSTEM NO TARGET' }
  const targetEntry = targetInstanceId
    ? viable.find(({ weapon }) => weapon.instanceId === targetInstanceId) || viable[0]
    : viable[Math.floor(Math.random() * viable.length)]
  const hpLoss = Math.max(1, Math.round(damage * 0.75))
  const updatedWeapons = weapons.map((weapon, index) => {
    if (!weapon || index !== targetEntry.index) return weapon
    const currentHp = Number.isFinite(Number(weapon.hp)) ? Number(weapon.hp) : (weapon.maxHp || 0)
    const nextHp = clamp(currentHp - hpLoss, 0, weapon.maxHp || 1)
    return {
      ...weapon,
      hp: nextHp,
      broken: nextHp <= 0,
      enabled: nextHp <= 0 ? false : weapon.enabled,
    }
  })
  const updated = updatedWeapons[targetEntry.index]
  return {
    weapons: updatedWeapons,
    detail: `${updated?.name || 'Weapon'} HP -${hpLoss}${updated?.broken ? ' BROKEN' : ''}`,
  }
}

function combatExposedCrewIds(run) {
  if (!run?.combat) return []
  const repairers = (run.combat.repairQueue || []).length > 0
    ? (run.crew || []).filter((member) => crewSkillLevel(member, 'repair_specialist') > 0 || crewPerkLevel(member, 'weapon_specialist', 'combat_repairs') > 0).map((member) => member.id)
    : []
  const reloaders = (run.player.weaponSlots || []).some((weapon) => weapon?.ammoType === 'missile' && weapon.autoReload && weapon.ammoLeft <= 0 && !weapon.broken)
    ? (run.crew || []).filter((member) => crewSkillLevel(member, 'weapon_specialist') > 0).map((member) => member.id)
    : []
  return [...new Set([...repairers, ...reloaders])]
}

function applyCrewDamageToList(crew, damage, exposedCrewIds = [], quartersHitChance = 0.12) {
  const viable = (crew || []).map((member, index) => ({ member, index })).filter(({ member }) => (member.health ?? member.healthMax ?? 1) > 0)
  if (viable.length === 0) return { crew, detail: 'CREW NO TARGET' }
  const exposedSet = new Set(exposedCrewIds)
  const exposedTargets = viable.filter(({ member }) => exposedSet.has(member.id))
  if (exposedTargets.length === 0 && Math.random() > quartersHitChance) return { crew, detail: 'CREW QUARTERS SHAKEN, NO CASUALTIES' }
  const pool = exposedTargets.length > 0 && Math.random() < 0.85 ? exposedTargets : viable
  const targetEntry = pool[Math.floor(Math.random() * pool.length)]
  const hpLoss = Math.max(1, Math.round(damage * 0.6))
  const updatedCrew = crew.map((member, index) => index === targetEntry.index ? { ...member, health: clamp((Number.isFinite(Number(member.health)) ? Number(member.health) : (member.healthMax || 0)) - hpLoss, 0, member.healthMax || 1) } : member)
  const updated = updatedCrew[targetEntry.index]
  return {
    crew: updatedCrew,
    detail: `${updated?.name || 'Crew'} HP -${hpLoss}${(updated?.health || 0) <= 0 ? ' DOWN' : ''}`,
  }
}

function applyTargetedImpact({ entity, systems, weapons, crew, targetSystem, damage, shieldPen, run = null, isTargetPlayerSide = false }) {
  if (targetSystem === 'hull') {
    const hullLoss = Math.max(1, Math.round(damage * Math.max(0.7, shieldPen)))
    return {
      entity: { ...entity, hull: Math.max(0, entity.hull - Math.max(1, hullLoss - (entity.armour || 0))) },
      systems,
      weapons,
      crew,
      detail: `HULL -${Math.max(1, hullLoss - (entity.armour || 0))}`,
    }
  }
  if (targetSystem === 'weapons' || String(targetSystem).startsWith('weapon:')) {
    const weaponResult = applyWeaponSystemDamage(weapons, damage, String(targetSystem).startsWith('weapon:') ? String(targetSystem).slice(7) : null)
    return { entity: { ...entity }, systems, weapons: weaponResult.weapons, crew, detail: weaponResult.detail }
  }
  if (targetSystem === 'shields') {
    const shieldResult = applyShieldSystemDamage(entity, systems, damage)
    return { entity: shieldResult.entity, systems: shieldResult.systems, weapons, crew, detail: shieldResult.detail }
  }
  if (targetSystem === 'engines') {
    const engineResult = applyEngineDamage(entity, systems, damage)
    return { entity: engineResult.entity, systems: engineResult.systems, weapons, crew, detail: engineResult.detail }
  }
  const crewResult = applyCrewDamageToList(crew, damage, isTargetPlayerSide ? combatExposedCrewIds(run) : [])
  return { entity: { ...entity }, systems, weapons, crew: crewResult.crew, detail: crewResult.detail }
}

function setCombatTarget(run, targetId) {
  if (!COMBAT_TARGETS.some((target) => target.id === targetId) && !String(targetId).startsWith('weapon:')) return run
  const next = deepClone(run)
  if (!next.combat) return next
  const selectedIndex = Number.isInteger(next.ui?.selectedCombatWeaponIndex) ? next.ui.selectedCombatWeaponIndex : null
  if (selectedIndex !== null && next.player.weaponSlots?.[selectedIndex]) {
    next.player.weaponSlots[selectedIndex].targetId = targetId
    next.ui.selectedCombatWeaponIndex = null
  }
  next.combat.playerTarget = targetId
  return next
}

function toggleCombatWeaponPower(run, slotIndex) {
  const next = deepClone(run)
  const weapon = next.player.weaponSlots?.[slotIndex]
  if (!weapon || weapon.broken) return next
  const projectedPower = weapon.enabled
    ? currentPowerUsage(next) - equipmentPowerDraw(weapon.id)
    : currentPowerUsage(next) + equipmentPowerDraw(weapon.id)
  if (!weapon.enabled && projectedPower > next.player.maxPower) return appendLog(next, `Powering ${weapon.name} would exceed ship power capacity (${projectedPower}/${next.player.maxPower}).`)
  next.player.weaponSlots[slotIndex].enabled = !weapon.enabled
  return next
}

function toggleCombatWeaponReload(run, slotIndex) {
  const next = deepClone(run)
  const weapon = next.player.weaponSlots?.[slotIndex]
  if (!weapon || weapon.ammoType !== 'missile') return next
  next.player.weaponSlots[slotIndex].autoReload = !weapon.autoReload
  return next
}

function selectCombatWeaponTargeting(run, slotIndex, side = 'player') {
  const next = deepClone(run)
  if (next.ui.selectedCombatWeaponIndex === slotIndex && next.ui.selectedCombatWeaponSide === side) {
    next.ui.selectedCombatWeaponIndex = null
  } else {
    next.ui.selectedCombatWeaponIndex = slotIndex
    next.ui.selectedCombatWeaponSide = side === 'enemy' ? 'enemy' : 'player'
  }
  return next
}

function selectHexCombatWeapon(run, side, slotIndex) {
  if (!run?.combat) return run
  const next = deepClone(run)
  const shipUnit = side === 'enemy' ? next.combat.enemyShipUnit : next.combat.playerShipUnit
  next.combat.selectedUnitId = shipUnit?.id || next.combat.selectedUnitId
  next.combat.selectedHex = shipUnit ? { ...hexCombatShipCenter(shipUnit) } : next.combat.selectedHex
  return selectCombatWeaponTargeting(next, slotIndex, side)
}

function toggleCombatAutomation(run, key) {
  const next = deepClone(run)
  if (!['autoRepair', 'autoReload'].includes(key)) return next
  next.player[key] = !next.player[key]
  return next
}

function toggleCombatRepairTarget(run, instanceId) {
  const next = deepClone(run)
  if (!next.combat) return next
  const queue = new Set(next.combat.repairQueue || [])
  if (queue.has(instanceId)) queue.delete(instanceId)
  else queue.add(instanceId)
  next.combat.repairQueue = [...queue]
  return next
}

function processCombatReloads(next, messages) {
  if (!next?.combat || next.player.autoReload === false || !playerHasWeaponSpecialist(next)) return next
  next.player.weaponSlots = (next.player.weaponSlots || []).map((weapon) => {
    if (!weapon || weapon.broken || !weapon.enabled || weapon.ammoType !== 'missile' || weapon.autoReload === false || (weapon.ammoLeft || 0) > 0) return weapon
    const loaded = consumeMissileAmmo(next)
    if (!loaded) return weapon
    messages.push(`Crew reload teams brought a level ${loaded.missileLevel} missile to ${weapon.name}.`)
    awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'weapon_specialist') > 0)
    return {
      ...weapon,
      ammoLeft: Math.max(1, Number(WEAPONS[weapon.id]?.rackSize) || 1),
      loadedAmmoLevel: loaded.missileLevel,
    }
  })
  return next
}

function brokenWeaponRepairCost(run, weapon) {
  const restoration = Math.max(0, ...(run?.crew || []).map((member) => crewPerkLevel(member, 'repair_specialist', 'restoration')))
  const reduction = clamp(restoration * 0.2, 0, 1)
  const baseParts = 1 + Math.ceil((weapon?.maxHp || 1) / 8)
  const baseScrap = 2 + Math.ceil((weapon?.maxHp || 1) / 6)
  return {
    parts: Math.max(0, Math.ceil(baseParts * (1 - reduction))),
    scrap: Math.max(0, Math.ceil(baseScrap * (1 - reduction))),
  }
}

function repairBrokenWeapon(run, slotIndex) {
  const next = deepClone(run)
  const weapon = next.player.weaponSlots?.[slotIndex]
  if (!weapon?.broken) return next
  const cost = brokenWeaponRepairCost(next, weapon)
  if (next.resources.parts < cost.parts || next.resources.scrap < cost.scrap) {
    return appendLog(next, `Not enough resources to repair ${weapon.name}. Requires ${cost.parts} parts and ${cost.scrap} scrap.`)
  }
  next.resources.parts -= cost.parts
  next.resources.scrap -= cost.scrap
  next.player.weaponSlots[slotIndex] = {
    ...weapon,
    hp: weapon.maxHp,
    broken: false,
    enabled: true,
    cooldownRemaining: 0,
    lastShotAt: 0,
    nextShotAt: 0,
  }
  return appendLog(next, `${weapon.name} was repaired for ${cost.parts} parts and ${cost.scrap} scrap.`)
}

function awardHexCombatVictory(next) {
  if (next.combat?.sourceNpcId) next.system.npcs = (next.system.npcs || []).filter((npc) => npc.id !== next.combat.sourceNpcId)
  else {
    const nodeIndex = next.system.nodes.findIndex((node) => node.id === next.currentNodeId)
    if (nodeIndex >= 0) next.system.nodes[nodeIndex].spent = true
  }
  let reward = { ...(next.combat?.enemy?.reward || {}) }
  const salvageBonus = scrapperBonus(next, 'enemy_salvage') + (next.crew || []).filter((member) => member.role === 'salvager').reduce((sum, member) => sum + Math.max(0, crewLevel(member) - 1), 0)
  if (salvageBonus > 0) reward = { ...reward, scrap: (reward.scrap || 0) + salvageBonus }
  const rewarded = applyReward(next, reward)
  awardCrewXp(rewarded, 2)
  awardCrewXp(rewarded, 1, (member) => crewSkillLevel(member, 'pilot') > 0 || crewSkillLevel(member, 'weapon_specialist') > 0)
  rewarded.combat.outcome = {
    kind: 'victory',
    title: `${rewarded.combat.enemy.name} neutralized`,
    reward,
  }
  return appendLog(rewarded, 'Enemy destroyed. Salvage recovered.')
}

function resolveHexCombatSource(next) {
  if (next.combat?.sourceNpcId) next.system.npcs = (next.system.npcs || []).filter((npc) => npc.id !== next.combat.sourceNpcId)
  else {
    const nodeIndex = next.system.nodes.findIndex((node) => node.id === next.currentNodeId)
    if (nodeIndex >= 0) next.system.nodes[nodeIndex].spent = true
  }
  return next
}

function isCombatUnitAlive(run, unitId) {
  const entry = findCombatUnit(run, unitId)
  if (!entry) return false
  if (entry.kind === 'ship') return entry.side === 'player' ? (run.player.hull || 0) > 0 : (run.combat.enemy.hull || 0) > 0
  return squadronAliveCount(entry.unit) > 0
}

function defaultHexTargetId(run, side = 'player') {
  if (!run?.combat) return null
  if (side === 'player') return isCombatUnitAlive(run, run.combat.enemyShipUnit?.id) ? run.combat.enemyShipUnit?.id : activeSquadron(run.combat, 'enemy')?.id || null
  return activeSquadron(run.combat, 'player')?.id || run.combat.playerShipUnit?.id || null
}

function selectedHexTargetId(run, side = 'player') {
  const selectedId = run?.combat?.selectedTargetUnitId
  if (side === 'player' && selectedId && isCombatUnitAlive(run, selectedId)) {
    const entry = findCombatUnit(run, selectedId)
    if (entry?.side === 'enemy') return selectedId
  }
  return defaultHexTargetId(run, side)
}

function weaponFocusedUnitId(run, weapon, side = 'player') {
  const targetId = weapon?.hexTargetUnitId
  if (!targetId || !isCombatUnitAlive(run, targetId)) return null
  const entry = findCombatUnit(run, targetId)
  if (!entry) return null
  if (side === 'player' && entry.side !== 'enemy') return null
  if (side === 'enemy' && entry.side !== 'player') return null
  return targetId
}

function selectedHexWeaponTargetId(run, weapon, side = 'player') {
  return weaponFocusedUnitId(run, weapon, side) || selectedHexTargetId(run, side)
}

function hexWeaponFocusMarkers(run) {
  const markers = {}
  const register = (weapon, index, side) => {
    const targetId = weaponFocusedUnitId(run, weapon, side)
    if (!targetId) return
    const bucket = markers[targetId] || { player: [], enemy: [] }
    bucket[side].push(index + 1)
    markers[targetId] = bucket
  }
  ;(run?.player?.weaponSlots || []).forEach((weapon, index) => register(weapon, index, 'player'))
  ;(run?.combat?.enemy?.weapons || []).forEach((weapon, index) => register(weapon, index, 'enemy'))
  return markers
}

function setHexCombatFeed(next, messages) {
  next.combat.feed = [...messages, ...(next.combat.feed || [])].slice(0, 18)
  return next
}

function appendHexCombatEffect(next, effect) {
  if (!next?.combat || !effect) return next
  next.combat.effects = [
    {
      id: createId('hex_fx'),
      startedAt: Date.now(),
      durationMs: 820,
      ...effect,
    },
    ...((next.combat.effects || []).filter((entry) => entry && Date.now() - (entry.startedAt || 0) <= (entry.durationMs || 1000))),
  ].slice(0, 12)
  return next
}

function appendHexCombatFloaters(next, targetId, entries = []) {
  if (!next?.combat || !targetId || !Array.isArray(entries) || entries.length === 0) return next
  const timestamp = Date.now()
  const fresh = entries.filter((entry) => entry?.text).map((entry, index) => ({
    id: createId('hex_float'),
    targetId,
    text: entry.text,
    colour: entry.colour || '#f8fafc',
    startedAt: timestamp,
    durationMs: entry.durationMs || 1050,
    stackIndex: index,
  }))
  next.combat.floaters = [...fresh, ...((next.combat.floaters || []).filter((entry) => entry && timestamp - (entry.startedAt || 0) <= (entry.durationMs || 1100)))].slice(0, 24)
  return next
}

function compactCombatWeaponLabel(weapon) {
  if (!weapon) return 'Unknown'
  if (weapon.id === 'Missile_I') return 'MSL'
  if (weapon.id === 'Kinetic_I') return 'KIN'
  if (weapon.id === 'Mining_Laser') return 'MIN'
  return 'LAS'
}

function weaponCanFireInHexCombat(run, weapon, isPlayerSide) {
  if (!weapon || weapon.enabled === false || weapon.broken || (weapon.hexReadyIn || 0) > 0) return false
  if (weapon.ammoType === 'missile') return (weapon.ammoLeft || 0) > 0
  if (weapon.ammoType) return isPlayerSide ? (run.resources[weapon.ammoType] || 0) > 0 : (weapon.ammoLeft || 0) > 0
  return true
}

function consumeHexCombatWeaponAmmo(next, weapon, isPlayerSide) {
  if (!weapon?.ammoType) return true
  if (weapon.ammoType === 'missile') {
    if ((weapon.ammoLeft || 0) <= 0) return false
    weapon.ammoLeft = Math.max(0, (weapon.ammoLeft || 0) - 1)
    return true
  }
  if (isPlayerSide) {
    if ((next.resources[weapon.ammoType] || 0) <= 0) return false
    next.resources[weapon.ammoType] = Math.max(0, (next.resources[weapon.ammoType] || 0) - 1)
    return true
  }
  if ((weapon.ammoLeft || 0) <= 0) return false
  weapon.ammoLeft = Math.max(0, (weapon.ammoLeft || 0) - 1)
  return true
}

function resolveHexDamageToUnit(next, targetId, damage, shieldPen = 0.05, sourceLabel = 'Player') {
  const target = findCombatUnit(next, targetId)
  if (!target) return { next, message: `${sourceLabel}: no target lock was available.`, destroyed: false }
  if (target.kind === 'ship') {
    if (target.side === 'enemy') {
      const before = { shields: next.combat.enemy.shields, hull: next.combat.enemy.hull }
      const updatedEnemy = applyDamage(next.combat.enemy, damage, shieldPen, next.combat.enemy.armour || 0)
      next.combat.enemy = { ...next.combat.enemy, ...updatedEnemy }
      const shieldLoss = Math.max(0, before.shields - updatedEnemy.shields)
      const hullLoss = Math.max(0, before.hull - updatedEnemy.hull)
      appendHexCombatFloaters(next, targetId, [
        { text: 'HIT' },
        ...(shieldLoss > 0 ? [{ text: `SHIELDS -${shieldLoss}`, colour: '#60a5fa' }] : []),
        ...(hullLoss > 0 ? [{ text: `HULL -${hullLoss}`, colour: '#f87171' }] : []),
        ...(updatedEnemy.hull <= 0 ? [{ text: 'DESTROYED', colour: '#f59e0b' }] : []),
      ])
      return { next, message: `${sourceLabel}: hit ${next.combat.enemy.name} for ${damage} damage.`, destroyed: next.combat.enemy.hull <= 0 }
    }
    const before = { shields: next.player.shields, hull: next.player.hull }
    const updatedPlayer = applyDamage({ hull: next.player.hull, shields: next.player.shields }, damage, shieldPen, next.player.armour || 0)
    next.player.hull = updatedPlayer.hull
    next.player.shields = updatedPlayer.shields
    const shieldLoss = Math.max(0, before.shields - updatedPlayer.shields)
    const hullLoss = Math.max(0, before.hull - updatedPlayer.hull)
    appendHexCombatFloaters(next, targetId, [
      { text: 'HIT' },
      ...(shieldLoss > 0 ? [{ text: `SHIELDS -${shieldLoss}`, colour: '#60a5fa' }] : []),
      ...(hullLoss > 0 ? [{ text: `HULL -${hullLoss}`, colour: '#f87171' }] : []),
      ...(updatedPlayer.hull <= 0 ? [{ text: 'DESTROYED', colour: '#f59e0b' }] : []),
    ])
    return { next, message: `${sourceLabel}: hit ${next.shipName} for ${damage} damage.`, destroyed: next.player.hull <= 0 }
  }
  const beforeShield = squadronShieldCount(target.unit)
  const beforeArmour = squadronArmourCount(target.unit)
  const beforeAlive = squadronAliveCount(target.unit)
  const result = applyDamageToSquadron(target.unit, damage)
  next.combat.squadrons = (next.combat.squadrons || [])
    .map((entry) => entry.id === target.unit.id ? result.squadron : entry)
    .filter((entry) => squadronAliveCount(entry) > 0)
  const shieldLoss = Math.max(0, beforeShield - squadronShieldCount(result.squadron))
  const armourLoss = Math.max(0, beforeArmour - squadronArmourCount(result.squadron))
  const destroyedDrones = Math.max(0, beforeAlive - squadronAliveCount(result.squadron))
  appendHexCombatFloaters(next, targetId, [
    { text: 'HIT' },
    ...(shieldLoss > 0 ? [{ text: `SHIELDS -${shieldLoss}`, colour: '#60a5fa' }] : []),
    ...(armourLoss > 0 ? [{ text: `ARMOUR -${armourLoss}`, colour: '#e2e8f0' }] : []),
    ...(destroyedDrones > 0 ? [{ text: destroyedDrones > 1 ? `DRONE DESTROYED x${destroyedDrones}` : 'DRONE DESTROYED', colour: '#f59e0b' }] : []),
  ])
  if (target.side === 'player' && result.destroyed) next.combat.droneBayCooldown = Math.max(next.combat.droneBayCooldown || 0, 2)
  if (target.side === 'enemy' && result.destroyed) next.combat.enemyDroneBayCooldown = Math.max(next.combat.enemyDroneBayCooldown || 0, 2)
  return { next, message: `${sourceLabel}: struck ${target.side === 'player' ? 'your' : 'enemy'} squadron. ${result.detail}.`, destroyed: result.destroyed }
}

function paymentSummaryDetails(cost) {
  return [
    ...(cost.credits > 0 ? [outcomeDelta('credits', -cost.credits)] : []),
    ...(cost.scrap > 0 ? [outcomeDelta('scrap', -cost.scrap)] : []),
    ...(cost.parts > 0 ? [outcomeDelta('parts', -cost.parts)] : []),
    ...(cost.fuel > 0 ? [outcomeDelta('fuel', -cost.fuel)] : []),
  ]
}

function applyTributePayment(next, cost) {
  next.resources.scrap = Math.max(0, next.resources.scrap - (cost.scrap || 0))
  next.resources.parts = Math.max(0, next.resources.parts - (cost.parts || 0))
  next.resources.credits = Math.max(0, next.resources.credits - (cost.credits || 0))
  if ((cost.fuel || 0) > 0) spendFuel(next, cost.fuel)
  return next
}

function selectHexCombatUnit(run, unitId) {
  if (!run?.combat) return run
  const entry = findCombatUnit(run, unitId)
  if (!entry) return run
  const next = deepClone(run)
  if (next.combat.selectedUnitId === unitId) {
    next.combat.selectedUnitId = null
    next.combat.selectedHex = null
    return next
  }
  next.combat.selectedUnitId = unitId
  if (entry.side === 'enemy') next.combat.selectedTargetUnitId = unitId
  next.combat.selectedHex = entry.kind === 'squadron' ? { ...entry.unit.position } : { ...hexCombatShipCenter(entry.unit) }
  return next
}

function startHexCombat(run, kind, openingFeed = [], enemyOverride = null, sourceNpcId = null) {
  const next = deepClone(run)
  const pilot = (next.crew || []).find((member) => member.role === 'pilot')
  const enemy = enemyOverride || buildEnemyCombatant(kind)
  const playerMovePoints = hexCombatShipMovePoints(playerSpeedValue(next))
  const enemyMovePoints = hexCombatShipMovePoints(enemy.speed)
  next.player.weaponSlots = (next.player.weaponSlots || []).map((weapon, index) => weapon ? prepareWeaponForHexCombat(weapon, index) : null)
  enemy.weapons = (enemy.weapons || []).map((weapon, index) => weapon ? prepareWeaponForHexCombat(weapon, index) : null)
  next.screen = 'combat_hex'
  next.combatWarning = null
  next.ui.selectedCombatWeaponIndex = null
  next.ui.selectedCombatWeaponSide = 'player'
  next.ui.menuOpen = false
  next.ui.menuPanel = 'root'
  next.combat = {
    mode: 'hex',
    enemy,
    turnNumber: 1,
    phase: 'player',
    feed: [...openingFeed, 'Tactical view online.', ...(pilot ? [`${pilot.name} is coordinating attack telemetry.`] : [])],
    outcome: null,
    sourceNpcId,
    squadrons: [],
    squadronLimit: DRONE_ACTIVE_LIMIT,
    droneBayCooldown: 0,
    enemyDroneBayCooldown: 0,
    effects: [],
    floaters: [],
    selectedHex: null,
    highlightedHexes: [],
    selectedUnitId: 'player_ship_unit',
    selectedTargetUnitId: 'enemy_ship_unit',
    playerShipUnit: buildHexShipUnit('player', { actionsPerTurn: playerMovePoints, actionsRemaining: playerMovePoints }),
    enemyShipUnit: buildHexShipUnit('enemy', { actionsPerTurn: enemyMovePoints, actionsRemaining: enemyMovePoints }),
    negotiation: null,
    autoCombat: false,
  }
  ensureFleetState(next.combat)
  next.ui.selectedCombatWeaponIndex = next.player.weaponSlots.findIndex(Boolean)
  return appendLog(next, `Combat engaged with ${enemy.name}.`)
}

function launchHexCombatSquadron(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  const next = deepClone(run)
  const deployed = deployHexCombatSquadron(next, 'player')
  if (!deployed.deployed) return appendLog(next, deployed.message)
  next.combat.highlightedHexes = []
  return setHexCombatFeed(next, [deployed.message])
}

function moveHexCombatSquadron(run, targetHex) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  if (!hexWithinArena(targetHex)) return run
  const next = deepClone(run)
  const selected = findCombatUnit(next, next.combat.selectedUnitId)
  const squadron = selected?.kind === 'squadron' && selected.side === 'player' ? selected.unit : activeSquadron(next.combat, 'player')
  if (!squadron) return appendLog(next, 'No active squadron is available to move.')
  if ((squadron.actionsRemaining || 0) <= 0) return appendLog(next, 'That squadron has no movement points left this turn.')
  if (squadron.position.col === targetHex.col && squadron.position.row === targetHex.row) return next
  if (combatOccupiedHexes(next.combat, squadron.id).some((entry) => hexEquals(entry, targetHex))) return appendLog(next, 'That hex is occupied.')
  const moveCost = hexDistance(squadron.position, targetHex)
  if (moveCost > (squadron.actionsRemaining || 0)) return appendLog(next, `Attack drones have only ${squadron.actionsRemaining || 0} movement point(s) left.`)
  squadron.position = { ...targetHex }
  squadron.actionsRemaining = Math.max(0, (squadron.actionsRemaining || 0) - moveCost)
  squadron.movedThisTurn = true
  next.combat.selectedUnitId = squadron.id
  next.combat.selectedHex = { ...targetHex }
  return setHexCombatFeed(next, [`Player: Attack squadron repositioned to ${targetHex.col + 1}-${targetHex.row + 1} (move -${moveCost}).`])
}

function moveHexCombatShip(run, side, target) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  const next = deepClone(run)
  const shipKey = side === 'player' ? 'playerShipUnit' : 'enemyShipUnit'
  const unit = next.combat[shipKey]
  if (!unit) return next
  if ((unit.actionsRemaining || 0) <= 0) return appendLog(next, `${side === 'player' ? 'Your' : 'Enemy'} ship has no movement points left this turn.`)
  const valid = hexCombatShipMoveTargets(next.combat, side, unit.actionsRemaining).find((entry) => entry.col === target.col && entry.row === target.row)
  if (!valid) return appendLog(next, 'That move is not available.')
  next.combat[shipKey] = buildHexShipUnit(side, { ...unit, col: valid.col, row: valid.row, actionsRemaining: Math.max(0, (unit.actionsRemaining || 0) - valid.distance), movedThisTurn: true })
  next.combat.selectedHex = { ...hexCombatShipCenter(next.combat[shipKey]) }
  if (side === 'player') next.combat.selectedUnitId = next.combat.playerShipUnit.id
  return setHexCombatFeed(next, [`${side === 'player' ? 'Player' : 'Enemy'}: ${side === 'player' ? next.shipName : next.combat.enemy.name} repositioned to ${valid.col + 1}-${valid.row + 1} (move -${valid.distance}).`])
}

function resolveHexCombatSquadronStrike(next, side = 'player', squadronId = null, targetIdOverride = null) {
  const selected = squadronId ? findCombatUnit(next, squadronId) : findCombatUnit(next, next.combat.selectedUnitId)
  const squadron = selected?.kind === 'squadron' && selected.side === side ? selected.unit : activeSquadron(next.combat, side)
  const sourceLabel = side === 'player' ? 'Player' : 'Enemy'
  const targetSide = side === 'player' ? 'enemy' : 'player'
  if (!squadron) return { next, attacked: false, message: `No ${side} squadron is available.` }
  if (squadron.attackAvailable === false) return { next, attacked: false, message: `${sourceLabel}: squadron strike already used this turn.` }
  const targetId = targetIdOverride || selectedHexTargetId(next, side)
  const target = findCombatUnit(next, targetId)
  if (!target || target.side !== targetSide) return { next, attacked: false, message: `${sourceLabel}: no hostile target is selected.` }
  const inRange = target.kind === 'ship' ? squadronAdjacentToShip(squadron, target.unit) : hexDistance(squadron.position, target.unit.position) <= 1
  if (!inRange) return { next, attacked: false, message: `${sourceLabel}: squadron is out of range.` }
  const volleyDamage = squadronAliveCount(squadron)
  appendHexCombatEffect(next, { fromUnitId: squadron.id, toUnitId: targetId, kind: 'drone_laser', colour: side === 'player' ? '#bbf7d0' : '#fca5a5', hit: true })
  const result = resolveHexDamageToUnit(next, targetId, volleyDamage, 0.05, sourceLabel)
  squadron.attackAvailable = false
  if (side === 'player') awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'weapon_specialist') > 0)
  return {
    next,
    attacked: true,
    damage: volleyDamage,
    message: `${sourceLabel}: Attack squadron delivered ${volleyDamage} drone-laser damage at close range.`,
    detail: result.message,
  }
}

function fireHexCombatSquadron(run, squadronId = null) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return run
  const next = deepClone(run)
  const result = resolveHexCombatSquadronStrike(next, 'player', squadronId)
  if (!result.attacked) return appendLog(next, result.message)
  if (next.combat.enemy.hull <= 0) {
    setHexCombatFeed(next, [result.message, result.detail])
    return awardHexCombatVictory(next)
  }
  return setHexCombatFeed(next, [result.message, result.detail])
}

function resolveHexCombatShipWeaponFire(next, side = 'player', weaponIndex, targetIdOverride = null) {
  const isPlayerSide = side === 'player'
  const sourceLabel = isPlayerSide ? 'Player' : 'Enemy'
  const sourceUnitId = isPlayerSide ? next.combat.playerShipUnit?.id : next.combat.enemyShipUnit?.id
  const weapons = shipWeaponsForSide(next, side)
  const weapon = weapons?.[weaponIndex]
  if (!weaponCanFireInHexCombat(next, weapon, isPlayerSide)) return { next, fired: false, message: `${sourceLabel}: that weapon is not ready.` }
  const targetId = targetIdOverride || selectedHexWeaponTargetId(next, weapon, side)
  const target = findCombatUnit(next, targetId)
  if (!target || target.side !== (isPlayerSide ? 'enemy' : 'player')) return { next, fired: false, message: `${sourceLabel}: no hostile target is selected.` }
  if (!consumeHexCombatWeaponAmmo(next, weapon, isPlayerSide)) return { next, fired: false, message: `${sourceLabel}: the weapon could not fire because it lacks ammunition.` }
  const damage = Math.max(1, Math.round((weapon.damage || 1) * (weapon.id === 'Missile_I' ? missileDamageBonus(weapon.loadedAmmoLevel || weapon.level || 1) : 1)))
  const shotRng = makeRng(`${next.seed}_hex_${side}_fire_${next.turn}_${next.combat.turnNumber}_${weapon.instanceId}_${targetId}`)
  const hit = shotRng.chance(weapon.accuracy || 1)
  appendHexCombatEffect(next, {
    fromUnitId: sourceUnitId,
    toUnitId: targetId,
    kind: weapon.id === 'Missile_I' ? 'missile' : weapon.id === 'Kinetic_I' ? 'kinetic' : weapon.id === 'Mining_Laser' ? 'mining' : 'laser',
    colour: isPlayerSide
      ? (weapon.id === 'Missile_I' ? '#fb923c' : weapon.id === 'Kinetic_I' ? '#e2e8f0' : weapon.id === 'Mining_Laser' ? '#a78bfa' : '#67e8f9')
      : (weapon.id === 'Missile_I' ? '#fb7185' : weapon.id === 'Kinetic_I' ? '#fecdd3' : weapon.id === 'Mining_Laser' ? '#fda4af' : '#fb7185'),
    hit,
  })
  weapon.hexReadyIn = weapon.hexCooldownTurns || hexCombatWeaponCooldownTurns(weapon)
  if (isPlayerSide) awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'weapon_specialist') > 0)
  if (!hit) {
    appendHexCombatFloaters(next, targetId, [{ text: 'MISS', colour: '#cbd5e1' }])
    return {
      next,
      fired: true,
      targetId,
      hit: false,
      damage,
      message: `${sourceLabel}: #${weaponIndex + 1} ${weapon.name} missed.`,
    }
  }
  const result = resolveHexDamageToUnit(next, targetId, damage, weapon.shieldPen || 0.05, sourceLabel)
  return {
    next,
    fired: true,
    targetId,
    hit: true,
    damage,
    message: `${sourceLabel}: #${weaponIndex + 1} ${weapon.name} fired for ${damage} damage.`,
    detail: result.message,
  }
}

function fireHexCombatShipWeapon(run, weaponIndex) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return run
  const next = deepClone(run)
  const result = resolveHexCombatShipWeaponFire(next, 'player', weaponIndex)
  if (!result.fired) return appendLog(next, result.message)
  if (next.combat.enemy.hull <= 0) {
    setHexCombatFeed(next, [result.message, result.detail].filter(Boolean))
    return awardHexCombatVictory(next)
  }
  return setHexCombatFeed(next, [result.message, result.detail].filter(Boolean))
}

function attemptHexCombatFlee(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return run
  const next = deepClone(run)
  if ((next.combat.playerShipUnit?.actionsRemaining || 0) <= 0) return appendLog(next, 'The ship needs movement points left to attempt a retreat.')
  const chance = escapeChanceAgainst(next, next.combat.enemy.kind)
  const rng = makeRng(`${next.seed}_hex_flee_${next.turn}_${next.combat.turnNumber}_${next.combat.enemy.hull}_${next.player.hull}`)
  next.combat.playerShipUnit.actionsRemaining = 0
  if (rng.chance(chance)) {
    next.screen = 'map'
    next.combat = null
    awardCrewXp(next, 2, (member) => crewSkillLevel(member, 'pilot') > 0)
    return setEventOutcome(
      appendLog(next, `Fled ${ENEMIES[run.combat.enemy.kind]?.name || run.combat.enemy.name} during tactical combat.`),
      { title: 'Combat evaded', text: 'Your ship disengaged and escaped from the tactical contact.', tone: 'green', details: [outcomeStatus('flee', 'SUCCESS')] },
    )
  }
  return setHexCombatFeed(next, ['Player: Flee attempt failed. Enemy contact maintained weapons lock.'])
}

function offerHexCombatSurrender(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return run
  const next = deepClone(run)
  if ((next.combat.playerShipUnit?.actionsRemaining || 0) <= 0) return appendLog(next, 'The ship needs movement points left to open surrender terms.')
  const baseCost = {
    ...tributeDemandCost(next),
    parts: next.combat.enemy.kind === 'patrol' ? 1 : 0,
    credits: next.combat.enemy.kind === 'merchant' ? 12 : 0,
  }
  if (!playerCanPayTribute(next, baseCost)) return appendLog(next, `You cannot cover a surrender offer of ${tributeSummary(baseCost)}.`)
  const rng = makeRng(`${next.seed}_hex_surrender_${next.turn}_${next.combat.turnNumber}_${next.combat.enemy.kind}`)
  const acceptChance = next.combat.enemy.kind === 'patrol' ? 0.58 : next.combat.enemy.kind === 'merchant' ? 0.74 : 0.44
  next.combat.playerShipUnit.actionsRemaining = 0
  if (rng.chance(acceptChance)) {
    applyTributePayment(next, baseCost)
    next.screen = 'map'
    next.combat = null
    return setEventOutcome(
      appendLog(next, `You surrendered resources and were released: ${tributeSummary(baseCost)}.`),
      { title: 'Surrender accepted', text: 'The opposing ship accepted payment and broke contact.', tone: 'amber', details: paymentSummaryDetails(baseCost) },
    )
  }
  const counterOffer = {
    scrap: baseCost.scrap + 4,
    parts: (baseCost.parts || 0) + 1,
    credits: baseCost.credits + (next.combat.enemy.kind === 'patrol' ? 10 : 0),
    fuel: (baseCost.fuel || 0) + 1,
  }
  next.combat.negotiation = {
    side: 'player',
    type: 'counteroffer',
    cost: counterOffer,
    text: `${next.combat.enemy.name} rejected your surrender terms and demanded ${tributeSummary(counterOffer)}.`,
  }
  return setHexCombatFeed(next, [`Enemy: ${next.combat.enemy.name} countered with ${tributeSummary(counterOffer)}.`])
}

function resolveHexCombatNegotiation(run, action) {
  if (!run?.combat?.negotiation || run.screen !== 'combat_hex') return run
  const next = deepClone(run)
  const negotiation = next.combat.negotiation
  if (action === 'reject') {
    next.combat.negotiation = null
    return setHexCombatFeed(next, [negotiation.side === 'enemy' ? 'Player: Rejected the enemy surrender offer.' : 'Player: Rejected the enemy counteroffer.'])
  }
  if (negotiation.side === 'enemy') {
    resolveHexCombatSource(next)
    const rewarded = applyReward(next, negotiation.cost || {})
    rewarded.combat.negotiation = null
    rewarded.combat.outcome = { kind: 'surrender', title: `${rewarded.combat.enemy.name} surrendered`, reward: negotiation.cost || {} }
    return appendLog(rewarded, `${rewarded.combat.enemy.name} surrendered and transferred payment.`)
  }
  if (!playerCanPayTribute(next, negotiation.cost || {})) return appendLog(next, `You cannot pay the counteroffer: ${tributeSummary(negotiation.cost || {})}.`)
  applyTributePayment(next, negotiation.cost || {})
  next.screen = 'map'
  next.combat = null
  return setEventOutcome(
    appendLog(next, `You paid the counteroffer and were released: ${tributeSummary(negotiation.cost || {})}.`),
    { title: 'Counteroffer accepted', text: 'The tactical contact ended after the payment was transferred.', tone: 'amber', details: paymentSummaryDetails(negotiation.cost || {}) },
  )
}

function nearestHexTowardTarget(start, targetHex, occupied = []) {
  const candidates = [
    { col: start.col + 1, row: start.row },
    { col: start.col - 1, row: start.row },
    { col: start.col, row: start.row + 1 },
    { col: start.col, row: start.row - 1 },
    { col: start.col + (start.row % 2 === 0 ? -1 : 1), row: start.row + 1 },
    { col: start.col + (start.row % 2 === 0 ? -1 : 1), row: start.row - 1 },
  ].filter((hex) => hexWithinArena(hex) && !occupied.some((entry) => hexEquals(entry, hex)))
  if (candidates.length === 0) return null
  return candidates.reduce((best, candidate) => {
    const score = hexDistance(candidate, targetHex)
    if (!best) return { ...candidate, score }
    return score < best.score ? { ...candidate, score } : best
  }, null)
}

function autoCombatShipTargetId(run, side) {
  if (!run?.combat) return null
  const hostileSide = side === 'player' ? 'enemy' : 'player'
  const hostileSquadron = activeSquadron(run.combat, hostileSide)
  const hostileShipId = hostileSide === 'enemy' ? run.combat.enemyShipUnit?.id : run.combat.playerShipUnit?.id
  if (!hostileSquadron) return hostileShipId || null
  const ownShip = side === 'player' ? run.combat.playerShipUnit : run.combat.enemyShipUnit
  const squadronPressure = hexDistance(hostileSquadron.position, hexCombatShipCenter(ownShip)) <= 2
  if (squadronPressure || !activeSquadron(run.combat, side)) return hostileSquadron.id
  return hostileShipId || hostileSquadron.id
}

function autoCombatSquadronTargetId(run, side) {
  if (!run?.combat) return null
  const hostileSide = side === 'player' ? 'enemy' : 'player'
  return activeSquadron(run.combat, hostileSide)?.id || (hostileSide === 'enemy' ? run.combat.enemyShipUnit?.id : run.combat.playerShipUnit?.id) || null
}

function chooseHexCombatShipMoveTarget(run, side, preference = 'aggressive') {
  if (!run?.combat) return null
  const shipUnit = side === 'player' ? run.combat.playerShipUnit : run.combat.enemyShipUnit
  if (!shipUnit || (shipUnit.actionsRemaining || 0) <= 0) return null
  const moveTargets = hexCombatShipMoveTargets(run.combat, side, shipUnit.actionsRemaining)
  if (moveTargets.length === 0) return null
  const hostileSide = side === 'player' ? 'enemy' : 'player'
  const focusHex = activeSquadron(run.combat, hostileSide)?.position || hexCombatShipCenter(hostileSide === 'enemy' ? run.combat.enemyShipUnit : run.combat.playerShipUnit)
  const currentScore = distanceToHexGroup(focusHex, hexCombatShipFootprint(shipUnit))
  const bestMove = moveTargets.reduce((best, candidate) => {
    const score = distanceToHexGroup(focusHex, hexCombatShipFootprint(buildHexShipUnit(side, { ...shipUnit, col: candidate.col, row: candidate.row })))
    if (!best) return { ...candidate, score }
    if (preference === 'defensive') return score > best.score ? { ...candidate, score } : best
    return score < best.score ? { ...candidate, score } : best
  }, null)
  if (!bestMove) return null
  if (preference === 'defensive' && bestMove.score <= currentScore) return null
  if (preference !== 'defensive' && bestMove.score >= currentScore) return null
  return bestMove
}

function resolveAutoSquadronTurn(next, side, messages) {
  const squadron = activeSquadron(next.combat, side)
  if (!squadron) return
  const targetId = autoCombatSquadronTargetId(next, side)
  const target = findCombatUnit(next, targetId)
  if (!target) return
  const targetHex = target.kind === 'ship' ? hexCombatShipCenter(target.unit) : target.unit.position
  let moved = 0
  while ((squadron.actionsRemaining || 0) > 0) {
    const inRange = target.kind === 'ship' ? squadronAdjacentToShip(squadron, target.unit) : hexDistance(squadron.position, target.unit.position) <= 1
    if (inRange) break
    const move = nearestHexTowardTarget(squadron.position, targetHex, combatOccupiedHexes(next.combat, squadron.id))
    if (!move) break
    squadron.position = { col: move.col, row: move.row }
    squadron.actionsRemaining = Math.max(0, (squadron.actionsRemaining || 0) - 1)
    squadron.movedThisTurn = true
    moved += 1
  }
  if (moved > 0) messages.push(`${side === 'player' ? 'Player' : 'Enemy'}: Attack squadron advanced to ${squadron.position.col + 1}-${squadron.position.row + 1} (move -${moved}).`)
  const strike = resolveHexCombatSquadronStrike(next, side, squadron.id, targetId)
  if (strike.attacked) {
    messages.push(strike.message)
    if (strike.detail) messages.push(strike.detail)
  }
}

function resolveAutoShipTurn(next, side, messages, rng) {
  const isPlayerSide = side === 'player'
  const shipUnit = isPlayerSide ? next.combat.playerShipUnit : next.combat.enemyShipUnit
  if (!shipUnit) return
  const cooldownKey = isPlayerSide ? 'droneBayCooldown' : 'enemyDroneBayCooldown'
  if (activeSquadrons(next.combat, side).length === 0 && (next.combat[cooldownKey] || 0) <= 0 && (isPlayerSide || rng.chance(0.62))) {
    const deployed = deployHexCombatSquadron(next, side)
    if (deployed.deployed) messages.push(deployed.message)
  }
  const preferredMove = chooseHexCombatShipMoveTarget(next, side, isPlayerSide ? 'defensive' : 'aggressive')
  if (preferredMove) {
    const shipKey = isPlayerSide ? 'playerShipUnit' : 'enemyShipUnit'
    next.combat[shipKey] = buildHexShipUnit(side, {
      ...next.combat[shipKey],
      col: preferredMove.col,
      row: preferredMove.row,
      actionsRemaining: Math.max(0, (next.combat[shipKey].actionsRemaining || 0) - preferredMove.distance),
      movedThisTurn: true,
    })
    messages.push(`${isPlayerSide ? 'Player' : 'Enemy'}: ${isPlayerSide ? next.shipName : next.combat.enemy.name} repositioned to ${preferredMove.col + 1}-${preferredMove.row + 1} (move -${preferredMove.distance}).`)
  }
  const readyWeapons = readyHexShipWeaponIndices(next, side)
  for (const weaponIndex of readyWeapons) {
    const targetId = autoCombatShipTargetId(next, side)
    const result = resolveHexCombatShipWeaponFire(next, side, weaponIndex, targetId)
    if (!result.fired) continue
    messages.push(result.message)
    if (result.detail) messages.push(result.detail)
    if (isPlayerSide && next.combat.enemy.hull <= 0) return
    if (!isPlayerSide && next.player.hull <= 0) return
  }
}

function enemyHexCombatAttemptExit(next, messages, rng) {
  const hullRatio = next.combat.enemy.hullMax > 0 ? next.combat.enemy.hull / next.combat.enemy.hullMax : 1
  if (hullRatio > 0.38 || next.combat.negotiation) return false
  if (rng.chance(0.28)) {
    const playerScore = playerSpeedValue(next) * 0.08 + ((next.player.maneuverability || 0) + pilotManeuverBonus(next)) * 0.06 + playerStealthValue(next) * 0.08
    const enemyScore = next.combat.enemy.speed * 0.08 + next.combat.enemy.maneuverability * 0.06 + next.combat.enemy.stealth * 0.08
    const fleeChance = clamp(0.12 + enemyScore - playerScore, 0.05, 0.68)
    next.combat.enemyShipUnit.actionsRemaining = 0
    if (rng.chance(fleeChance)) {
      resolveHexCombatSource(next)
      next.combat.outcome = { kind: 'enemy_fled', title: `${next.combat.enemy.name} fled the field`, reward: {} }
      messages.push(`Enemy: ${next.combat.enemy.name} disengaged and escaped.`)
      return true
    }
    messages.push(`Enemy: ${next.combat.enemy.name} attempted to flee but failed.`)
    return false
  }
  if (rng.chance(next.combat.enemy.kind === 'merchant' || next.combat.enemy.kind === 'civilian' ? 0.64 : 0.34)) {
    const offer = enemyTributeOffer(next)
    if (tributeSummary(offer)) {
      next.combat.enemyShipUnit.actionsRemaining = 0
      next.combat.negotiation = {
        side: 'enemy',
        type: 'tribute_offer',
        cost: offer,
        text: `${next.combat.enemy.name} is offering ${tributeSummary(offer)} to disengage.`,
      }
      messages.push(`Enemy: ${next.combat.enemy.name} offered ${tributeSummary(offer)} to stand down.`)
      return true
    }
  }
  return false
}

function resolveHexCombatTurn(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  if (run.combat.negotiation) return appendLog(run, 'Resolve the current surrender or counteroffer before ending the turn.')
  const next = deepClone(run)
  const messages = []
  const rng = makeRng(`${next.seed}_hex_turn_${next.turn}_${next.combat.turnNumber}_${next.player.hull}_${next.combat.enemy.hull}`)

  if (!enemyHexCombatAttemptExit(next, messages, rng)) {
    resolveAutoSquadronTurn(next, 'enemy', messages)
    if (next.player.hull > 0) resolveAutoShipTurn(next, 'enemy', messages, rng)
  }

  next.player.weaponSlots = decrementHexWeaponCooldowns(next.player.weaponSlots)
  next.combat.enemy.weapons = decrementHexWeaponCooldowns(next.combat.enemy.weapons)
  next.combat.squadrons = (next.combat.squadrons || []).map((entry) => regenerateSquadronShield({ ...entry, actionsPerTurn: droneMoveRange(), movedThisTurn: false, actionsRemaining: droneMoveRange(), attackAvailable: true })).filter((entry) => squadronAliveCount(entry) > 0)
  next.combat.playerShipUnit = buildHexShipUnit('player', { ...next.combat.playerShipUnit, actionsPerTurn: next.combat.playerShipUnit?.actionsPerTurn || hexCombatShipMovePoints(playerSpeedValue(next)), actionsRemaining: next.combat.playerShipUnit?.actionsPerTurn || hexCombatShipMovePoints(playerSpeedValue(next)), attackAvailable: true, movedThisTurn: false, firedThisTurn: false })
  next.combat.enemyShipUnit = buildHexShipUnit('enemy', { ...next.combat.enemyShipUnit, actionsPerTurn: next.combat.enemyShipUnit?.actionsPerTurn || hexCombatShipMovePoints(next.combat.enemy.speed), actionsRemaining: next.combat.enemyShipUnit?.actionsPerTurn || hexCombatShipMovePoints(next.combat.enemy.speed), attackAvailable: true, movedThisTurn: false, firedThisTurn: false })
  next.combat.droneBayCooldown = Math.max(0, (next.combat.droneBayCooldown || 0) - 1)
  next.combat.enemyDroneBayCooldown = Math.max(0, (next.combat.enemyDroneBayCooldown || 0) - 1)
  next.combat.effects = (next.combat.effects || []).filter((effect) => effect && Date.now() - (effect.startedAt || 0) <= (effect.durationMs || 1000))
  next.combat.floaters = (next.combat.floaters || []).filter((entry) => entry && Date.now() - (entry.startedAt || 0) <= (entry.durationMs || 1100))
  next.combat.turnNumber = Math.max(1, (next.combat.turnNumber || 1) + 1)
  const selectedEntry = findCombatUnit(next, next.combat.selectedUnitId)
  next.combat.selectedHex = selectedEntry
    ? (selectedEntry.kind === 'squadron' ? { ...selectedEntry.unit.position } : { ...hexCombatShipCenter(selectedEntry.unit) })
    : null
  next.combat.highlightedHexes = []
  setHexCombatFeed(next, messages)

  if (next.player.hull <= 0) {
    next.screen = 'gameover'
    next.combat = null
    return appendLog(next, 'The player ship was destroyed in tactical combat.')
  }
  return next
}

function toggleHexCombatAutoCombat(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  const next = deepClone(run)
  next.combat.autoCombat = !next.combat.autoCombat
  return next
}

function resolveHexCombatAutoCombatStep(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  if (run.combat.negotiation?.side === 'enemy') return resolveHexCombatNegotiation(run, 'accept')
  if (run.combat.negotiation) return toggleHexCombatAutoCombat(run)
  const next = deepClone(run)
  const messages = []
  const rng = makeRng(`${next.seed}_hex_auto_player_${next.turn}_${next.combat.turnNumber}_${next.player.hull}_${next.combat.enemy.hull}`)
  resolveAutoSquadronTurn(next, 'player', messages)
  if (next.combat.enemy.hull <= 0) {
    next.combat.autoCombat = false
    setHexCombatFeed(next, messages)
    return awardHexCombatVictory(next)
  }
  resolveAutoShipTurn(next, 'player', messages, rng)
  if (next.combat.enemy.hull <= 0) {
    next.combat.autoCombat = false
    setHexCombatFeed(next, messages)
    return awardHexCombatVictory(next)
  }
  if (messages.length > 0) setHexCombatFeed(next, messages)
  const resolved = resolveHexCombatTurn(next)
  if (!resolved?.combat || resolved.screen !== 'combat_hex') return resolved
  if (resolved.combat.outcome) {
    resolved.combat.autoCombat = false
    return resolved
  }
  resolved.combat.autoCombat = true
  return resolved
}

function autoResolveHexCombat(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome || run.combat.negotiation) return run
  let next = deepClone(run)
  let resolvedTurns = 0
  while (next?.combat && next.screen === 'combat_hex' && !next.combat.outcome && next.player.hull > 0 && resolvedTurns < 30) {
    next = resolveHexCombatAutoCombatStep({ ...next, combat: { ...next.combat, autoCombat: false } })
    resolvedTurns += 1
  }
  if (next?.screen === 'gameover' || !next?.combat?.outcome) return next
  const outcomeTitle = next.combat.outcome.title
  const completed = continueAfterCombat(next)
  completed.ui.eventOutcome = completed.ui.eventOutcome
    ? {
        ...completed.ui.eventOutcome,
        title: 'Auto-resolve complete',
        text: `${outcomeTitle}. Combat was resolved automatically in ${resolvedTurns} turn(s).`,
      }
    : completed.ui.eventOutcome
  return appendLog(completed, `Auto-resolve completed in ${resolvedTurns} turn(s).`)
}

// Fleet combat: both sides plan, then every order resolves in one round
// (movement first, then all fire at once), in the manner of simultaneous-turn
// fleet games. Ship weapons aim at a unit and, for ships, at one of its systems.

const FLEET_SYSTEM_IDS = ['hull', 'weapons', 'shields', 'engines', 'crew']
const FLEET_SYSTEM_LABELS = { hull: 'Hull', weapons: 'Weapons', shields: 'Shields', engines: 'Engines', crew: 'Crew' }
const FLEET_MOVE_PLAYBACK_MS = 700
const FLEET_ROUND_PLAYBACK_MS = 1700

function ensureFleetState(combat) {
  if (!combat) return combat
  const systems = (value) => ({
    shieldLayersDisabled: Math.max(0, Number(value?.shieldLayersDisabled) || 0),
    engineDamage: Math.max(0, Number(value?.engineDamage) || 0),
  })
  combat.orders = combat.orders && typeof combat.orders === 'object' ? combat.orders : {}
  combat.playerSystems = systems(combat.playerSystems)
  combat.enemySystems = systems(combat.enemySystems)
  combat.lastRound = combat.lastRound && typeof combat.lastRound === 'object' ? combat.lastRound : null
  combat.exitCheckedTurn = Math.max(0, Number(combat.exitCheckedTurn) || 0)
  return combat
}

function fleetCombatActive(run) {
  return Boolean(run?.combat && run.screen === 'combat_hex' && !run.combat.outcome && !run.combat.negotiation)
}

function fleetShipMoveOptions(run) {
  if (!run?.combat?.playerShipUnit) return []
  return hexCombatShipMoveTargets(run.combat, 'player', run.combat.playerShipUnit.actionsRemaining)
}

function fleetSquadronMoveHexes(run, squadronId) {
  const entry = findCombatUnit(run, squadronId)
  if (!entry || entry.kind !== 'squadron' || entry.side !== 'player') return []
  const range = entry.unit.actionsRemaining || 0
  if (range <= 0) return []
  const occupied = combatOccupiedHexes(run.combat, entry.unit.id)
  return Array.from({ length: HEX_ARENA.cols * HEX_ARENA.rows }, (_, index) => ({ col: index % HEX_ARENA.cols, row: Math.floor(index / HEX_ARENA.cols) }))
    .filter((hex) => !hexEquals(hex, entry.unit.position) && hexDistance(entry.unit.position, hex) <= range && !occupied.some((entry2) => hexEquals(entry2, hex)))
}

function selectFleetUnit(run, unitId) {
  const entry = findCombatUnit(run, unitId)
  if (!entry || entry.side !== 'player') return run
  const next = deepClone(run)
  next.combat.selectedUnitId = unitId
  if (entry.kind !== 'ship') next.ui.selectedCombatWeaponIndex = null
  else if (!Number.isInteger(next.ui.selectedCombatWeaponIndex)) next.ui.selectedCombatWeaponIndex = next.player.weaponSlots.findIndex(Boolean)
  return next
}

function selectFleetWeapon(run, weaponIndex) {
  if (!run?.combat || !run.player.weaponSlots?.[weaponIndex]) return run
  const next = deepClone(run)
  next.combat.selectedUnitId = next.combat.playerShipUnit.id
  next.ui.selectedCombatWeaponIndex = weaponIndex
  next.ui.selectedCombatWeaponSide = 'player'
  return next
}

function planFleetShipMove(run, option) {
  if (!fleetCombatActive(run) || !option) return run
  const next = deepClone(run)
  ensureFleetState(next.combat)
  const shipId = next.combat.playerShipUnit.id
  const valid = fleetShipMoveOptions(next).find((entry) => entry.col === option.col && entry.row === option.row)
  if (!valid) return run
  next.combat.orders[shipId] = { ...(next.combat.orders[shipId] || {}), move: { col: valid.col, row: valid.row, distance: valid.distance } }
  next.combat.selectedUnitId = shipId
  return next
}

function planFleetSquadronMove(run, squadronId, hex) {
  if (!fleetCombatActive(run)) return run
  if (!fleetSquadronMoveHexes(run, squadronId).some((entry) => hexEquals(entry, hex))) return run
  const next = deepClone(run)
  ensureFleetState(next.combat)
  const entry = findCombatUnit(next, squadronId)
  next.combat.orders[squadronId] = { ...(next.combat.orders[squadronId] || {}), move: { col: hex.col, row: hex.row, distance: hexDistance(entry.unit.position, hex) } }
  next.combat.selectedUnitId = squadronId
  return next
}

function clearFleetMove(run, unitId) {
  if (!run?.combat?.orders?.[unitId]?.move) return run
  const next = deepClone(run)
  next.combat.orders[unitId] = { ...next.combat.orders[unitId], move: null }
  return next
}

function aimFleetWeapon(run, weaponIndex, targetUnitId, systemId = null) {
  if (!fleetCombatActive(run)) return run
  const target = findCombatUnit(run, targetUnitId)
  if (!target || target.side !== 'enemy' || !run.player.weaponSlots?.[weaponIndex]) return run
  const next = deepClone(run)
  const weapon = next.player.weaponSlots[weaponIndex]
  weapon.hexTargetUnitId = targetUnitId
  if (target.kind === 'ship') weapon.targetId = FLEET_SYSTEM_IDS.includes(systemId) ? systemId : (FLEET_SYSTEM_IDS.includes(weapon.targetId) ? weapon.targetId : 'hull')
  next.combat.selectedTargetUnitId = targetUnitId
  return next
}

function aimFleetSquadron(run, squadronId, targetUnitId) {
  if (!fleetCombatActive(run)) return run
  const target = findCombatUnit(run, targetUnitId)
  if (!target || target.side !== 'enemy') return run
  const next = deepClone(run)
  ensureFleetState(next.combat)
  next.combat.orders[squadronId] = { ...(next.combat.orders[squadronId] || {}), targetId: targetUnitId }
  return next
}

function fleetWeaponTarget(run, weapon) {
  return weaponFocusedUnitId(run, weapon, 'player') || defaultHexTargetId(run, 'player')
}

function fleetSquadronTarget(run, squadron) {
  const planned = run.combat?.orders?.[squadron.id]?.targetId
  if (planned && isCombatUnitAlive(run, planned) && findCombatUnit(run, planned)?.side !== squadron.side) return planned
  return autoCombatSquadronTargetId(run, squadron.side)
}

function squadronStepToward(combat, squadron, targetHex, steps) {
  let position = { ...squadron.position }
  let moved = 0
  for (let index = 0; index < steps; index += 1) {
    if (hexDistance(position, targetHex) <= 1) break
    const occupied = combatOccupiedHexes({ ...combat, squadrons: (combat.squadrons || []).map((entry) => entry.id === squadron.id ? { ...entry, position } : entry) }, squadron.id)
    const step = nearestHexTowardTarget(position, targetHex, occupied)
    if (!step) break
    position = { col: step.col, row: step.row }
    moved += 1
  }
  return { position, moved }
}

function rollFleetShipShot(next, side, weaponIndex, targetId, systemId, rng) {
  const isPlayerSide = side === 'player'
  const weapons = shipWeaponsForSide(next, side)
  const weapon = weapons?.[weaponIndex]
  if (!weaponCanFireInHexCombat(next, weapon, isPlayerSide)) return null
  const target = findCombatUnit(next, targetId)
  if (!target || target.side === side) return null
  if (!consumeHexCombatWeaponAmmo(next, weapon, isPlayerSide)) return null
  const multiplier = isPlayerSide ? weaponDamageMultiplier(next, true) : 1
  const damage = Math.max(1, Math.round((weapon.damage || 1) * multiplier * (weapon.id === 'Missile_I' ? missileDamageBonus(weapon.loadedAmmoLevel || weapon.level || 1) : 1)))
  const hit = rng.chance(weapon.accuracy || 1)
  weapon.hexReadyIn = weapon.hexCooldownTurns || hexCombatWeaponCooldownTurns(weapon)
  appendHexCombatEffect(next, {
    fromUnitId: isPlayerSide ? next.combat.playerShipUnit?.id : next.combat.enemyShipUnit?.id,
    toUnitId: targetId,
    kind: weapon.id === 'Missile_I' ? 'missile' : weapon.id === 'Kinetic_I' ? 'kinetic' : weapon.id === 'Mining_Laser' ? 'mining' : 'laser',
    colour: isPlayerSide ? '#46E0FF' : '#FF6170',
    hit,
  })
  if (isPlayerSide) awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'weapon_specialist') > 0)
  return { side, weaponName: weapon.name, weaponId: weapon.id, shieldPen: weapon.shieldPen || 0.05, targetId, systemId: target.kind === 'ship' ? systemId : 'hull', damage, hit }
}

function applyFleetSystemHit(next, targetSide, systemId, damage) {
  if (targetSide === 'enemy') {
    const result = applyTargetedImpact({
      entity: next.combat.enemy,
      systems: next.combat.enemySystems,
      weapons: next.combat.enemy.weapons,
      crew: next.combat.enemy.crew || [],
      targetSystem: systemId,
      damage,
      shieldPen: 0,
      run: next,
      isTargetPlayerSide: false,
    })
    next.combat.enemy = { ...next.combat.enemy, ...result.entity, weapons: result.weapons, crew: result.crew }
    next.combat.enemySystems = result.systems
    return result.detail
  }
  const result = applyTargetedImpact({
    entity: next.player,
    systems: next.combat.playerSystems,
    weapons: next.player.weaponSlots,
    crew: next.crew,
    targetSystem: systemId,
    damage,
    shieldPen: 0,
    run: next,
    isTargetPlayerSide: true,
  })
  next.player = { ...next.player, ...result.entity, weaponSlots: result.weapons }
  next.crew = result.crew
  next.combat.playerSystems = result.systems
  return result.detail
}

function applyFleetShipShot(next, shot, summary) {
  const sourceName = shot.side === 'player' ? next.shipName : next.combat.enemy.name
  const target = findCombatUnit(next, shot.targetId)
  const targetName = target?.kind === 'ship' ? (target.side === 'player' ? next.shipName : next.combat.enemy.name) : (target?.side === 'player' ? 'your drones' : 'their drones')
  if (!shot.hit) {
    appendHexCombatFloaters(next, shot.targetId, [{ text: 'MISS', colour: '#cbd5e1' }])
    summary.push({ tone: 'mute', text: `${sourceName}'s ${shot.weaponName.replace(/ Mk \d+$/, '')} missed` })
    return
  }
  if (!target) return
  const hullBefore = target.kind === 'ship' ? (target.side === 'player' ? next.player.hull : next.combat.enemy.hull) : 0
  const result = resolveHexDamageToUnit(next, shot.targetId, shot.damage, shot.shieldPen, shot.side === 'player' ? 'Player' : 'Enemy')
  const hullAfter = target.kind === 'ship' ? (target.side === 'player' ? next.player.hull : next.combat.enemy.hull) : 0
  let systemDetail = null
  if (target.kind === 'ship' && shot.systemId !== 'hull' && hullBefore - hullAfter > 0 && hullAfter > 0) {
    systemDetail = applyFleetSystemHit(next, target.side, shot.systemId, shot.damage)
    appendHexCombatFloaters(next, shot.targetId, [{ text: `${FLEET_SYSTEM_LABELS[shot.systemId].toUpperCase()} HIT`, colour: '#FFB443' }])
  }
  const tone = shot.side === 'player' ? 'good' : 'bad'
  const systemText = systemDetail ? ` · ${FLEET_SYSTEM_LABELS[shot.systemId].toLowerCase()} damaged` : target.kind === 'ship' && hullBefore === hullAfter ? ' · absorbed by shields' : ''
  summary.push({ tone, text: `${sourceName} hit ${targetName} for ${shot.damage}${systemText}` })
  return result
}

function planFleetSquadronStrike(next, squadron) {
  if (!squadron || squadron.attackAvailable === false || squadronAliveCount(squadron) <= 0) return null
  const targetId = fleetSquadronTarget(next, squadron)
  const target = findCombatUnit(next, targetId)
  if (!target || target.side === squadron.side) return null
  const inRange = target.kind === 'ship' ? squadronAdjacentToShip(squadron, target.unit) : hexDistance(squadron.position, target.unit.position) <= 1
  if (!inRange) return null
  return { squadronId: squadron.id, side: squadron.side, targetId, damage: squadronAliveCount(squadron) }
}

function applyFleetSquadronStrike(next, strike, summary) {
  const squadron = (next.combat.squadrons || []).find((entry) => entry.id === strike.squadronId)
  if (squadron) squadron.attackAvailable = false
  if (!isCombatUnitAlive(next, strike.targetId)) return
  const target = findCombatUnit(next, strike.targetId)
  const aliveBefore = target?.kind === 'squadron' ? squadronAliveCount(target.unit) : 0
  appendHexCombatEffect(next, { fromUnitId: strike.squadronId, toUnitId: strike.targetId, kind: 'drone_laser', colour: strike.side === 'player' ? '#46E0FF' : '#FF6170', hit: true })
  resolveHexDamageToUnit(next, strike.targetId, strike.damage, 0.05, strike.side === 'player' ? 'Player' : 'Enemy')
  if (strike.side === 'player') awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'weapon_specialist') > 0)
  const owner = strike.side === 'player' ? 'Your drones' : 'Enemy drones'
  if (target?.kind === 'squadron') {
    const after = findCombatUnit(next, strike.targetId)
    const lost = aliveBefore - (after ? squadronAliveCount(after.unit) : 0)
    summary.push({ tone: strike.side === 'player' ? 'good' : 'bad', text: lost > 0 ? `${owner} destroyed ${lost} drone${lost === 1 ? '' : 's'}` : `${owner} struck enemy drones` })
  } else {
    summary.push({ tone: strike.side === 'player' ? 'good' : 'bad', text: `${owner} hit ${strike.side === 'player' ? next.combat.enemy.name : next.shipName} for ${strike.damage}` })
  }
}

function repairFleetSystems(next, side, summary) {
  const key = side === 'player' ? 'playerSystems' : 'enemySystems'
  const systems = next.combat[key]
  const canRepair = side === 'player'
    ? playerRepairCapacity(next) > 0
    : (next.combat.enemy.crew || []).some((member) => member.role === 'repair_specialist' && (member.health ?? 1) > 0)
  if (!canRepair) return
  if (systems.shieldLayersDisabled > 0) {
    systems.shieldLayersDisabled -= 1
    if (side === 'player') summary.push({ tone: 'good', text: 'Crew brought a shield layer back online' })
  } else if (systems.engineDamage > 0) {
    const amount = side === 'player' ? Math.max(2, Math.round(playerRepairRate(next) * 2)) : 2
    systems.engineDamage = Math.max(0, systems.engineDamage - amount)
    if (side === 'player') summary.push({ tone: 'good', text: 'Crew patched the engines' })
  }
}

function enemyCrewDisabled(next) {
  const crew = next.combat?.enemy?.crew || []
  return crew.length > 0 && crew.every((member) => (member.health ?? 1) <= 0)
}

function resolveFleetRound(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  if (run.combat.negotiation) return appendLog(run, 'Answer the offer on the table before executing.')
  const next = deepClone(run)
  const combat = ensureFleetState(next.combat)
  const roundNumber = combat.turnNumber
  const roundStart = Date.now()
  const messages = []
  const summary = []
  const rng = makeRng(`${next.seed}_fleet_${next.turn}_${roundNumber}_${next.player.hull}_${combat.enemy.hull}`)

  if (combat.exitCheckedTurn !== roundNumber) {
    combat.exitCheckedTurn = roundNumber
    if (enemyHexCombatAttemptExit(next, messages, rng)) {
      setHexCombatFeed(next, messages)
      return next
    }
  }

  const unitPositions = () => Object.fromEntries([
    [combat.playerShipUnit.id, { kind: 'ship', side: 'player', col: combat.playerShipUnit.col, row: combat.playerShipUnit.row }],
    [combat.enemyShipUnit.id, { kind: 'ship', side: 'enemy', col: combat.enemyShipUnit.col, row: combat.enemyShipUnit.row }],
    ...(combat.squadrons || []).map((squadron) => [squadron.id, { kind: 'squadron', side: squadron.side, col: squadron.position.col, row: squadron.position.row }]),
  ])
  const before = unitPositions()

  // Movement. Enemy intentions are chosen from the positions both fleets started the round in.
  const enemyShipPlan = chooseHexCombatShipMoveTarget(next, 'enemy', 'aggressive')
  const shipOrder = combat.orders[combat.playerShipUnit.id]?.move
  if (shipOrder) {
    const valid = hexCombatShipMoveTargets(combat, 'player', combat.playerShipUnit.actionsRemaining).find((entry) => entry.col === shipOrder.col && entry.row === shipOrder.row)
    if (valid) {
      combat.playerShipUnit = buildHexShipUnit('player', { ...combat.playerShipUnit, col: valid.col, row: valid.row, actionsRemaining: Math.max(0, (combat.playerShipUnit.actionsRemaining || 0) - valid.distance), movedThisTurn: true })
      messages.push(`Player: ${next.shipName} moved ${valid.distance} hex${valid.distance === 1 ? '' : 'es'}.`)
    } else {
      summary.push({ tone: 'mute', text: `${next.shipName} could not reach the planned position` })
    }
  }
  activeSquadrons(combat, 'player').forEach((squadron) => {
    const move = combat.orders[squadron.id]?.move
    if (!move) return
    const blocked = combatOccupiedHexes(combat, squadron.id).some((entry) => hexEquals(entry, move))
    const cost = hexDistance(squadron.position, move)
    if (blocked || cost > (squadron.actionsRemaining || 0)) {
      summary.push({ tone: 'mute', text: 'Your drones could not reach their planned hex' })
      return
    }
    squadron.position = { col: move.col, row: move.row }
    squadron.actionsRemaining = Math.max(0, (squadron.actionsRemaining || 0) - cost)
    squadron.movedThisTurn = true
  })
  if (activeSquadrons(combat, 'enemy').length === 0 && (combat.enemyDroneBayCooldown || 0) <= 0 && rng.chance(0.62)) {
    const deployed = deployHexCombatSquadron(next, 'enemy')
    if (deployed.deployed) {
      messages.push(deployed.message)
      summary.push({ tone: 'bad', text: `${combat.enemy.name} launched a drone squadron` })
    }
  }
  activeSquadrons(combat, 'enemy').forEach((squadron) => {
    if (squadron.launchedTurn === roundNumber) return
    const targetId = fleetSquadronTarget(next, squadron)
    const target = findCombatUnit(next, targetId)
    if (!target) return
    const targetHex = target.kind === 'ship' ? hexCombatShipCenter(target.unit) : target.unit.position
    const inRange = target.kind === 'ship' ? squadronAdjacentToShip(squadron, target.unit) : hexDistance(squadron.position, target.unit.position) <= 1
    if (inRange) return
    const step = squadronStepToward(combat, squadron, targetHex, squadron.actionsRemaining || 0)
    squadron.position = step.position
    squadron.actionsRemaining = Math.max(0, (squadron.actionsRemaining || 0) - step.moved)
    squadron.movedThisTurn = step.moved > 0
  })
  if (enemyShipPlan) {
    const valid = hexCombatShipMoveTargets(combat, 'enemy', combat.enemyShipUnit.actionsRemaining).find((entry) => entry.col === enemyShipPlan.col && entry.row === enemyShipPlan.row)
    if (valid) combat.enemyShipUnit = buildHexShipUnit('enemy', { ...combat.enemyShipUnit, col: valid.col, row: valid.row, actionsRemaining: Math.max(0, (combat.enemyShipUnit.actionsRemaining || 0) - valid.distance), movedThisTurn: true })
  }
  const after = unitPositions()

  // Fire. Every shot is rolled from the post-movement state before any damage lands.
  const strikes = [...activeSquadrons(combat, 'player'), ...activeSquadrons(combat, 'enemy')].map((squadron) => planFleetSquadronStrike(next, squadron)).filter(Boolean)
  const shots = []
  next.player.weaponSlots.forEach((weapon, index) => {
    if (!weapon) return
    const targetId = fleetWeaponTarget(next, weapon)
    const shot = targetId ? rollFleetShipShot(next, 'player', index, targetId, FLEET_SYSTEM_IDS.includes(weapon.targetId) ? weapon.targetId : 'hull', rng) : null
    if (shot) shots.push(shot)
  })
  if (combat.enemy.hull > 0 && !enemyCrewDisabled(next)) {
    readyHexShipWeaponIndices(next, 'enemy').forEach((index) => {
      const targetId = autoCombatShipTargetId(next, 'enemy')
      const shot = targetId ? rollFleetShipShot(next, 'enemy', index, targetId, chooseEnemyTargetSystem(rng), rng) : null
      if (shot) shots.push(shot)
    })
  }
  strikes.forEach((strike) => applyFleetSquadronStrike(next, strike, summary))
  shots.forEach((shot) => applyFleetShipShot(next, shot, summary))
  if (shots.length === 0 && strikes.length === 0) summary.push({ tone: 'mute', text: 'No one was in a position to fire' })

  repairFleetSystems(next, 'player', summary)
  repairFleetSystems(next, 'enemy', summary)
  processCombatReloads(next, messages)
  processCombatRepairs(next, 3, messages)

  // Round bookkeeping, as at the end of a tactical turn.
  const playerMoves = Math.max(1, hexCombatShipMovePoints(playerSpeedValue(next)) - combatEnginePenalty(combat.playerSystems))
  const enemyMoves = Math.max(1, hexCombatShipMovePoints(combat.enemy.speed) - combatEnginePenalty(combat.enemySystems))
  next.player.weaponSlots = decrementHexWeaponCooldowns(next.player.weaponSlots)
  combat.enemy.weapons = decrementHexWeaponCooldowns(combat.enemy.weapons)
  combat.squadrons = (combat.squadrons || []).map((entry) => regenerateSquadronShield({ ...entry, actionsPerTurn: droneMoveRange(), movedThisTurn: false, actionsRemaining: droneMoveRange(), attackAvailable: true })).filter((entry) => squadronAliveCount(entry) > 0)
  combat.playerShipUnit = buildHexShipUnit('player', { ...combat.playerShipUnit, actionsPerTurn: playerMoves, actionsRemaining: playerMoves, attackAvailable: true, movedThisTurn: false, firedThisTurn: false })
  combat.enemyShipUnit = buildHexShipUnit('enemy', { ...combat.enemyShipUnit, actionsPerTurn: enemyMoves, actionsRemaining: enemyMoves, attackAvailable: true, movedThisTurn: false, firedThisTurn: false })
  combat.droneBayCooldown = Math.max(0, (combat.droneBayCooldown || 0) - 1)
  combat.enemyDroneBayCooldown = Math.max(0, (combat.enemyDroneBayCooldown || 0) - 1)
  combat.orders = Object.fromEntries(Object.entries(combat.orders || {}).filter(([unitId]) => isCombatUnitAlive(next, unitId)).map(([unitId, order]) => [unitId, { ...order, move: null }]))
  combat.turnNumber = roundNumber + 1
  if (!isCombatUnitAlive(next, combat.selectedUnitId) || findCombatUnit(next, combat.selectedUnitId)?.side !== 'player') combat.selectedUnitId = combat.playerShipUnit.id

  // Shots land after the fleets have finished moving on screen.
  combat.effects = (combat.effects || []).map((effect) => (effect.startedAt >= roundStart ? { ...effect, startedAt: effect.startedAt + FLEET_MOVE_PLAYBACK_MS } : effect))
  combat.floaters = (combat.floaters || []).map((entry) => (entry.startedAt >= roundStart ? { ...entry, startedAt: entry.startedAt + FLEET_MOVE_PLAYBACK_MS + 260 } : entry))
  combat.lastRound = { number: roundNumber, at: roundStart, seen: false, before, after, summary: summary.slice(0, 5) }
  setHexCombatFeed(next, [...messages, ...summary.map((entry) => entry.text + '.')])

  if (next.player.hull <= 0) {
    next.screen = 'gameover'
    next.combat = null
    return appendLog(next, 'The player ship was destroyed in tactical combat.')
  }
  if (combat.enemy.hull <= 0) return awardHexCombatVictory(next)
  if (enemyCrewDisabled(next)) {
    const won = awardHexCombatVictory(next)
    won.combat.outcome.title = `${won.combat.enemy.name} crew disabled`
    return won
  }
  return next
}

function acknowledgeFleetRound(run) {
  if (!run?.combat?.lastRound) return run
  const next = deepClone(run)
  next.combat.lastRound.seen = true
  return next
}

function autoPlanFleetOrders(next) {
  const combat = ensureFleetState(next.combat)
  const plan = chooseHexCombatShipMoveTarget(next, 'player', 'defensive')
  combat.orders[combat.playerShipUnit.id] = { ...(combat.orders[combat.playerShipUnit.id] || {}), move: plan ? { col: plan.col, row: plan.row, distance: plan.distance } : null }
  next.player.weaponSlots.forEach((weapon) => {
    if (!weapon) return
    const targetId = autoCombatShipTargetId(next, 'player')
    weapon.hexTargetUnitId = targetId
    if (findCombatUnit(next, targetId)?.kind === 'ship' && !FLEET_SYSTEM_IDS.includes(weapon.targetId)) weapon.targetId = 'hull'
  })
  if (activeSquadrons(combat, 'player').length === 0 && (combat.droneBayCooldown || 0) <= 0) deployHexCombatSquadron(next, 'player')
  activeSquadrons(combat, 'player').forEach((squadron) => {
    const targetId = autoCombatSquadronTargetId(next, 'player')
    const target = findCombatUnit(next, targetId)
    if (!target) return
    const targetHex = target.kind === 'ship' ? hexCombatShipCenter(target.unit) : target.unit.position
    const step = squadronStepToward(combat, squadron, targetHex, squadron.actionsRemaining || 0)
    combat.orders[squadron.id] = { targetId, move: step.moved > 0 ? { ...step.position, distance: step.moved } : null }
  })
  return next
}

function autoResolveFleetCombat(run) {
  if (!fleetCombatActive(run)) return run
  let next = deepClone(run)
  let rounds = 0
  while (next?.combat && next.screen === 'combat_hex' && !next.combat.outcome && rounds < 30) {
    if (next.combat.negotiation) {
      if (next.combat.negotiation.side !== 'enemy') break
      next = resolveHexCombatNegotiation(next, 'accept')
      continue
    }
    next = resolveFleetRound(autoPlanFleetOrders(deepClone(next)))
    rounds += 1
  }
  if (next?.screen === 'gameover' || !next?.combat?.outcome) {
    if (next?.combat) next.combat.lastRound = null
    return next
  }
  const outcomeTitle = next.combat.outcome.title
  const completed = continueAfterCombat(next)
  completed.ui.eventOutcome = completed.ui.eventOutcome ? { ...completed.ui.eventOutcome, title: 'Auto-resolve complete', text: `${outcomeTitle} after ${rounds} round${rounds === 1 ? '' : 's'}.` } : completed.ui.eventOutcome
  return completed
}

function startCombat(run, kind, openingFeed = [], enemyOverride = null, sourceNpcId = null) {
  const next = deepClone(run)
  awardCrewXp(next, 1)
  const pilot = (next.crew || []).find((member) => member.role === 'pilot')
  next.player.weaponSlots = (next.player.weaponSlots || []).map((weapon, index) => weapon ? buildWeaponInstance(weapon.id, index, { ...weapon, targetId: weapon.targetId || 'hull', autoReload: weapon.autoReload ?? next.player.autoReload, cooldownRemaining: 0, lastShotAt: 0, nextShotAt: 0 }) : null)
  next.screen = 'combat'
  next.combatWarning = null
  next.ui.selectedCombatWeaponIndex = null
  next.combat = {
    enemy: enemyOverride || buildEnemyCombatant(kind),
    speed: 2,
    playerTarget: 'hull',
    enemyTarget: 'hull',
    playerSystems: { shieldLayersDisabled: 0, engineDamage: 0 },
    enemySystems: { shieldLayersDisabled: 0, engineDamage: 0 },
    repairQueue: [],
    feed: [...openingFeed, 'Combat started.', ...(pilot ? [`${pilot.name} has the evasive helm.`] : [])],
    shots: [],
    outcome: null,
    sourceNpcId,
  }
  return appendLog(next, `Combat engaged with ${ENEMIES[kind].name}.`)
}

function engageCombatWarning(run) {
  if (!run?.combatWarning?.enemyKind) return run
  return startHexCombat(run, run.combatWarning.enemyKind, [], run.combatWarning.enemy, run.combatWarning.sourceNpcId)
}

function fleeCombatWarning(run) {
  if (!run?.combatWarning?.enemyKind) return run
  const next = deepClone(run)
  const rng = makeRng(`${next.seed}_combat_warning_flee_${next.turn}_${next.combatWarning.id}`)
  const success = rng.chance(next.combatWarning.escapeChance || 0)
  next.combatWarning = null
  if (success) {
    next.screen = 'map'
    awardCrewXp(next, 2, (member) => crewSkillLevel(member, 'pilot') > 0)
    return setEventOutcome(
      appendLog(next, `Fled the ${ENEMIES[run.combatWarning.enemyKind]?.name || 'hostile contact'} before weapons lock.`),
      { title: 'Combat avoided', text: 'Your ship broke contact before the engagement began.', tone: 'green', details: [outcomeStatus('flee', 'SUCCESS')] },
    )
  }
  return startHexCombat(appendLog(next, 'Flee attempt failed. The hostile contact closed and forced battle.'), run.combatWarning.enemyKind, ['Flee attempt failed.'], run.combatWarning.enemy, run.combatWarning.sourceNpcId)
}

function demandTributeFromEnemy(run) {
  if (!run?.combatWarning?.enemyKind || run.combatWarning.enemyKind === 'patrol') return run
  const next = deepClone(run)
  const offer = enemyTributeOffer(next)
  const enemy = next.combatWarning.enemy
  const sourceNpcId = next.combatWarning.sourceNpcId
  const enemyHasAnything = (offer.scrap || 0) > 0 || (offer.parts || 0) > 0 || (offer.credits || 0) > 0
  const rng = makeRng(`${next.seed}_demand_tribute_${next.turn}_${next.combatWarning.id}`)
  const acceptChance = enemy.kind === 'civilian' ? 0.76 : enemy.kind === 'merchant' ? 0.62 : enemy.kind === 'pirate' ? 0.2 : 0.34
  if (!enemyHasAnything || !rng.chance(acceptChance)) {
    return startHexCombat(
      appendLog(next, `${enemy.name} rejected your tribute demand.`),
      next.combatWarning.enemyKind,
      [`${enemy.name} rejected your tribute demand.`],
      next.combatWarning.enemy,
      next.combatWarning.sourceNpcId,
    )
  }
  next.screen = 'map'
  next.combatWarning = null
  next.resources.scrap += offer.scrap || 0
  next.resources.parts += offer.parts || 0
  next.resources.credits += offer.credits || 0
  if (sourceNpcId) next.system.npcs = (next.system.npcs || []).filter((npc) => npc.id !== sourceNpcId)
  return setEventOutcome(
    appendLog(next, `${enemy.name} paid tribute rather than fight.`),
    {
      title: 'Enemy tribute accepted',
      text: `${enemy.name} transferred payment and broke contact.`,
      tone: 'green',
      details: [
        ...(offer.credits ? [outcomeDelta('credits', offer.credits)] : []),
        ...(offer.scrap ? [outcomeDelta('scrap', offer.scrap)] : []),
        ...(offer.parts ? [outcomeDelta('parts', offer.parts)] : []),
      ],
    },
  )
}

function resolveCombatDemand(run, demandId) {
  if (!run?.combatWarning?.enemyKind) return run
  const next = deepClone(run)
  if (demandId === 'allow_inspection') {
    next.screen = 'map'
    next.combatWarning = null
    return completePoliceInspection(next)
  }
  if (demandId === 'pay_tribute') {
    const cost = tributeDemandCost(next)
    if (!playerCanPayTribute(next, cost)) {
      return startHexCombat(
        appendLog(next, `You could not pay the demanded tribute (${tributeSummary(cost)}). Combat became unavoidable.`),
        next.combatWarning.enemyKind,
        ['Tribute payment failed.'],
        next.combatWarning.enemy,
        next.combatWarning.sourceNpcId,
      )
    }
    next.screen = 'map'
    next.combatWarning = null
    next.resources.scrap = Math.max(0, next.resources.scrap - cost.scrap)
    next.resources.parts = Math.max(0, next.resources.parts - (cost.parts || 0))
    next.resources.credits = Math.max(0, next.resources.credits - (cost.credits || 0))
    if (cost.fuel > 0) spendFuel(next, cost.fuel)
    return setEventOutcome(
      appendLog(next, `You paid tribute to the hostile contact: ${tributeSummary(cost)}.`),
      {
        title: 'Tribute accepted',
        text: 'The hostile ship broke off after taking payment.',
        tone: 'amber',
        details: [
          ...(cost.credits > 0 ? [outcomeDelta('credits', -cost.credits)] : []),
          ...(cost.scrap > 0 ? [outcomeDelta('scrap', -cost.scrap)] : []),
          ...(cost.parts > 0 ? [outcomeDelta('parts', -cost.parts)] : []),
          ...(cost.fuel > 0 ? [outcomeDelta('fuel', -cost.fuel)] : []),
        ],
      },
    )
  }
  return next
}

function isNodeDepleted(node) {
  if (!node) return false
  if (node.kind === 'depot') return Boolean(node.salvaged)
  return Boolean(node.spent)
}

function resolveNodeArrival(run) {
  const next = deepClone(run)
  const node = findNode(next.system, next.currentNodeId)
  const idx = next.system.nodes.findIndex((entry) => entry.id === node.id)
  const liveNode = next.system.nodes[idx]
  if (!liveNode || liveNode.kind === 'empty' || liveNode.kind === 'base_arrival' || liveNode.kind === 'base_departure' || liveNode.kind === 'planet' || liveNode.kind === 'belt') return next
  if (isNodeDepleted(liveNode)) return appendLog(next, `Returned to ${liveNode.label}. Nothing new was available.`)
  if (liveNode.kind === 'pirate' || liveNode.kind === 'patrol') {
    const rng = makeRng(`${next.seed}_contact_detect_${next.turn}_${next.currentNodeId}_${liveNode.kind}`)
    const detected = rng.chance(contactDetectionChance(next, liveNode.kind, liveNode.kind === 'patrol' ? 0.82 : 0.76))
    if (!detected) {
      return setEventOutcome(
        appendLog(next, `${liveNode.label} failed to detect ${next.shipName}. The ship slipped past the contact unseen.`),
        { title: 'Detection avoided', text: `Your ship's stealth profile kept ${liveNode.label} from locking onto you.`, tone: 'green', details: [outcomeStatus('stealth', 'CONTACT EVADED')] },
      )
    }
    return queueCombatEncounter(
      next,
      liveNode.kind,
      liveNode.kind === 'patrol' ? 'Police challenge' : 'Pirate contact',
      liveNode.kind === 'patrol'
        ? `${liveNode.label} is moving to intercept and inspect your ship.`
        : `${liveNode.label} has turned in to engage your ship.`,
      liveNode.kind === 'patrol'
        ? 'A police patrol blocked the route and demanded combat readiness.'
        : 'A pirate group at the current waypoint moved to attack.',
    )
  }

  if (liveNode.kind === 'wreck') {
    liveNode.spent = true
    next.resources.scrap += 10
    next.resources.parts += 4
    return appendLog(next, 'Salvaged the wreck: +10 scrap, +4 parts.')
  }
  if (liveNode.kind === 'hazard') {
    liveNode.spent = true
    next.player.hull = Math.max(0, next.player.hull - 9)
    if (next.player.hull <= 0) {
      next.screen = 'gameover'
      return appendLog(next, 'The ship was destroyed by a navigational hazard.')
    }
    return appendLog(next, 'Passed through a hazard. Hull -9.')
  }
  if (liveNode.kind === 'distress') {
    liveNode.spent = true
    const rng = makeRng(`${next.seed}_distress_${next.turn}_${next.currentNodeId}`)
    if (rng.chance(0.55)) {
      if (crewAtCapacity(next)) {
        next.resources.parts += 3
        return appendLog(next, 'A survivor answered the distress signal, but the ship had no berth available. Supplies were transferred instead.')
      }
      next.crew.push(buildCrew(rng, false))
      syncSelectedCrew(next)
      return appendLog(next, 'A survivor was recovered from the distress signal.')
    }
    next.resources.parts += 3
    return appendLog(next, 'The distress beacon was old, but some supplies remained.')
  }
  if (liveNode.kind === 'convoy') {
    liveNode.spent = true
    return appendLog(next, 'Passed a slow civilian convoy and traded quick rumours.')
  }
  if (liveNode.kind === 'survey') {
    liveNode.spent = true
    return appendLog(next, 'A survey team was charting the orbit and broadcasting fresh observations.')
  }
  if (liveNode.kind === 'anomaly') return appendLog(next, 'Anomaly reached. A controlled probe can be launched from the secondary terminal.')
  if (liveNode.kind === 'relay') return appendLog(next, 'Relay reached. You can request route data and traffic intelligence from the secondary terminal.')
  if (liveNode.kind === 'depot') return appendLog(next, 'Supply depot reached. A salvage attempt can be made from the secondary terminal.')
  if (liveNode.kind === 'shipyard') return appendLog(next, 'Ship construction station reached. New hulls and equipment upgrades are available.')
  if (liveNode.kind === 'merchant') return appendLog(next, 'Merchant contact established.')
  if (liveNode.kind === 'station') return appendLog(next, 'Minor station reached.')
  return next
}

function nextOrbitOffsets(system, wrapOffsets = true) {
  return system.orbitOffsets.map((offset, orbit) => {
    const advanced = offset + system.orbitDirections[orbit] * system.orbitStepShifts[orbit]
    return wrapOffsets ? wrap(advanced, MASTER.slotCounts[orbit]) : advanced
  })
}

function advanceOrbitOffsets(system) {
  const next = deepClone(system)
  next.orbitOffsets = nextOrbitOffsets(system, true)
  return next
}

function performMove(run, targetNodeId, yearsMultiplier = 1, logText = null, travelMode = 'travel') {
  const current = findNode(run.system, run.currentNodeId)
  const target = findNode(run.system, targetNodeId)
  const distance = nodeDistance(run.system, current, target)
  const fuelCost = fuelCostForDistance(run, distance, travelMode)
  let next = deepClone(run)
  next.turn += 1
  awardCrewXp(next, 1)
  awardCrewXp(next, 1, (member) => member.role === 'pilot')
  next.currentNodeId = targetNodeId
  next.selectedNodeId = targetNodeId
  next.ui.merchantOpen = false
  next.system = advanceOrbitOffsets(next.system)
  spendFuel(next, fuelCost)
  next = appendLog(next, logText || `Travel completed. Fuel -${fuelCost}.`)
  next = resolveNodeArrival(next)
  if (next.screen === 'map' && !next.pendingEvent) next = advanceNpcTraffic(next, current.id, target.id)
  if (next.screen === 'map' && !next.pendingEvent) next = maybeTriggerTravelEvent(next, travelMode, current.id, target.id)
  if (next.screen === 'map' && !next.pendingEvent) next = maybeTriggerSecurityEncounter(next, current.id, target.id, travelMode)
  if (next.player.hull <= 0) next.screen = 'gameover'
  return next
}

function applyReward(run, reward) {
  const next = deepClone(run)
  Object.entries(reward).forEach(([key, value]) => {
    next.resources[key] = (next.resources[key] || 0) + value
  })
  return next
}

function pilotManeuverBonus(run) {
  const roleBonus = (() => {
    const pilotLevel = highestCrewLevel(run, 'pilot')
    return pilotLevel > 0 ? Math.floor((pilotLevel - 1) / 3) : 0
  })()
  return roleBonus + pilotDodgeBonus(run)
}

function chooseEnemyTargetSystem(rng) {
  const roll = rng.next()
  if (roll < 0.36) return 'hull'
  if (roll < 0.56) return 'shields'
  if (roll < 0.74) return 'engines'
  if (roll < 0.9) return 'weapons'
  return 'crew'
}

function processCombatRepairs(next, dtSeconds, messages) {
  if (next.player.autoRepair) {
    const autoTargets = next.player.weaponSlots.filter((weapon) => weapon && (weapon.hp || 0) < (weapon.maxHp || 1)).map((weapon) => weapon.instanceId)
    next.combat.repairQueue = [...new Set([...(next.combat.repairQueue || []), ...autoTargets])]
  }
  const activeQueue = (next.combat.repairQueue || []).filter((instanceId) => next.player.weaponSlots.some((weapon) => weapon?.instanceId === instanceId && (weapon.hp || 0) < (weapon.maxHp || 1)))
  if (activeQueue.length === 0) return next
  const repairSlots = playerRepairCapacity(next)
  const repairRate = playerRepairRate(next)
  if (repairSlots <= 0 || repairRate <= 0) return next
  const repairingIds = activeQueue.slice(0, repairSlots)
  const perTargetRate = repairRate / repairingIds.length
  let repairedAnything = false
  next.player.weaponSlots = next.player.weaponSlots.map((weapon) => {
    if (!weapon || !repairingIds.includes(weapon.instanceId)) return weapon
    const nextHp = clamp((weapon.hp || 0) + perTargetRate * dtSeconds, 0, weapon.maxHp || 1)
    const repaired = nextHp !== (weapon.hp || 0)
    if (repaired) repairedAnything = true
    const restored = {
      ...weapon,
      hp: nextHp,
      broken: nextHp <= 0,
      enabled: nextHp > 0 ? true : false,
    }
    if (nextHp >= (weapon.maxHp || 1)) messages.push(`Crew repair teams restored ${weapon.name} to full integrity.`)
    return restored
  })
  next.combat.repairQueue = activeQueue.filter((instanceId) => {
    const weapon = next.player.weaponSlots.find((entry) => entry?.instanceId === instanceId)
    return weapon && (weapon.hp || 0) < (weapon.maxHp || 1)
  })
  if (repairedAnything) awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'repair_specialist') > 0 || crewPerkLevel(member, 'weapon_specialist', 'combat_repairs') > 0)
  return next
}

function tickCombat(run) {
  if (!run || run.screen !== 'combat' || !run.combat) return run
  if (run.combat.outcome || run.combat.speed <= 0) return run
  const next = deepClone(run)
  const previousFeed = Array.isArray(run.combat?.feed) ? run.combat.feed : []
  const nowTs = Date.now()
  const dtSeconds = 0.08 * next.combat.speed
  const rng = makeRng(`${next.seed}_combat_${next.turn}_${nowTs}_${next.combat.enemy.hull}_${next.player.hull}`)
  const repairMessages = []
  const reloadMessages = []
  processCombatReloads(next, reloadMessages)
  processCombatRepairs(next, dtSeconds, repairMessages)

  const fireVolley = ({ weapons, sourceLabel, isPlayerSide, ammoPool, targetEntity, targetSystems, targetWeapons, targetCrew, targetSystem, targetDodgeBonus = 0 }) => {
    let updatedEntity = { ...targetEntity, shields: effectiveCombatShields(targetEntity, targetSystems) }
    let updatedSystems = { ...(targetSystems || {}) }
    let updatedWeapons = weapons.map((weapon) => (weapon ? { ...weapon } : null))
    let updatedTargetWeapons = (targetWeapons || []).map((weapon) => (weapon ? { ...weapon } : null))
    let updatedTargetCrew = (targetCrew || []).map((member) => ({ ...member }))
    const updatedAmmo = { ...ammoPool }
    const shots = []
    const volleyMessages = []
    updatedWeapons.forEach((weapon) => {
      if (!weapon) return
      weapon.cooldownRemaining = Math.max(0, weapon.cooldownRemaining - dtSeconds)
      if (!weapon.enabled || weapon.broken || (weapon.hp || 0) <= 0) return
      if (weapon.nextShotAt && nowTs < weapon.nextShotAt) return
      const resolvedTarget = isPlayerSide ? (weapon.targetId || targetSystem || 'hull') : targetSystem
      if (weapon.ammoType) {
        if (isPlayerSide) {
          if (weapon.ammoType === 'missile') {
            if ((weapon.ammoLeft || 0) <= 0) return
          } else if ((updatedAmmo[weapon.ammoType] || 0) <= 0) return
        } else if (Number.isFinite(Number(weapon.ammoLeft)) && (weapon.ammoLeft || 0) <= 0) return
      }
      weapon.lastShotAt = nowTs
      weapon.nextShotAt = nowTs + effectiveWeaponCooldownMs(weapon, next, isPlayerSide)
      weapon.cooldownRemaining = Math.max(0, (weapon.nextShotAt - nowTs) / 1000)
      if (weapon.ammoType) {
        if (isPlayerSide) {
          if (weapon.ammoType === 'missile') weapon.ammoLeft = Math.max(0, (weapon.ammoLeft || 0) - 1)
          else updatedAmmo[weapon.ammoType] -= 1
        }
        else if (Number.isFinite(Number(weapon.ammoLeft))) weapon.ammoLeft = Math.max(0, (weapon.ammoLeft || 0) - 1)
      }
      const laneIndex = shots.length
      const targetManeuver = effectiveCombatManeuverability(updatedEntity, updatedSystems, targetDodgeBonus)
      if (rng.next() > weapon.accuracy) {
        volleyMessages.push(`${sourceLabel}: ${weapon.name} missed ${combatTargetLabel(resolvedTarget, updatedTargetWeapons)}.`)
        shots.push(createCombatShot(weapon, sourceLabel === 'Player' ? 'player' : 'enemy', false, laneIndex, nowTs))
        return
      }
      if (rng.next() < dodgeChance(targetManeuver)) {
        volleyMessages.push(`${sourceLabel}: ${weapon.name} was dodged while targeting ${combatTargetLabel(resolvedTarget, updatedTargetWeapons)}.`)
        shots.push(createCombatShot(weapon, sourceLabel === 'Player' ? 'player' : 'enemy', false, laneIndex, nowTs))
        return
      }
      const ammoBonus = weapon.ammoType === 'missile' ? missileDamageBonus(weapon.loadedAmmoLevel || weapon.level || 1) : 1
      const damageAmount = Math.max(1, Math.round(weapon.damage * weaponDamageMultiplier(next, isPlayerSide) * ammoBonus))
      const impact = applyTargetedImpact({
        entity: updatedEntity,
        systems: updatedSystems,
        weapons: updatedTargetWeapons,
        crew: updatedTargetCrew,
        targetSystem: resolvedTarget,
        damage: damageAmount,
        shieldPen: weapon.shieldPen,
        run: next,
        isTargetPlayerSide: !isPlayerSide,
      })
      updatedEntity = impact.entity
      updatedSystems = impact.systems
      updatedTargetWeapons = impact.weapons
      updatedTargetCrew = impact.crew
      volleyMessages.push(`${sourceLabel}: ${weapon.name} hit ${combatTargetLabel(resolvedTarget, updatedTargetWeapons)}. ${impact.detail}.`)
      if (isPlayerSide) awardCrewXp(next, 1, (member) => crewSkillLevel(member, 'weapon_specialist') > 0)
      shots.push(createCombatShot(weapon, sourceLabel === 'Player' ? 'player' : 'enemy', true, laneIndex, nowTs))
    })
    return { updatedWeapons, updatedEntity, updatedSystems, updatedAmmo, updatedTargetWeapons, updatedTargetCrew, shots, messages: volleyMessages }
  }

  const playerVolley = fireVolley({
    weapons: next.player.weaponSlots,
    sourceLabel: 'Player',
    isPlayerSide: true,
    ammoPool: next.resources,
    targetEntity: next.combat.enemy,
    targetSystems: next.combat.enemySystems,
    targetWeapons: next.combat.enemy.weapons,
    targetCrew: next.combat.enemy.crew,
    targetSystem: next.combat.playerTarget,
    targetDodgeBonus: 0,
  })
  next.player.weaponSlots = playerVolley.updatedWeapons
  next.combat.enemy = { ...next.combat.enemy, ...playerVolley.updatedEntity, weapons: playerVolley.updatedTargetWeapons, crew: playerVolley.updatedTargetCrew }
  next.combat.enemySystems = playerVolley.updatedSystems
  next.resources = playerVolley.updatedAmmo
  next.combat.shots = [...(next.combat.shots || []).filter((shot) => nowTs - shot.startedAt < (shot.durationMs || 800) + 300), ...playerVolley.shots]

  if (next.combat.enemy.hull <= 0) {
    if (next.combat.sourceNpcId) next.system.npcs = (next.system.npcs || []).filter((npc) => npc.id !== next.combat.sourceNpcId)
    else {
      const nodeIndex = next.system.nodes.findIndex((node) => node.id === next.currentNodeId)
      if (nodeIndex >= 0) next.system.nodes[nodeIndex].spent = true
    }
    let reward = { ...next.combat.enemy.reward }
    const salvageBonus = scrapperBonus(next, 'enemy_salvage') + (next.crew || []).filter((member) => member.role === 'salvager').reduce((sum, member) => sum + Math.max(0, crewLevel(member) - 1), 0)
    if (salvageBonus > 0) reward = { ...reward, scrap: (reward.scrap || 0) + salvageBonus }
    const rewarded = applyReward(next, reward)
    awardCrewXp(rewarded, 3)
    awardCrewXp(rewarded, 2, (member) => ['pilot', 'repair', 'hacker', 'salvager'].includes(member.role) || crewSkillLevel(member, 'weapon_specialist') > 0)
    rewarded.combat.feed = [...(salvageBonus > 0 ? [`Salvager crew recovered +${salvageBonus} extra scrap.`] : []), ...playerVolley.messages, ...reloadMessages, ...repairMessages, ...previousFeed].slice(0, 18)
    rewarded.combat.outcome = {
      kind: 'victory',
      title: `${rewarded.combat.enemy.name} destroyed`,
      reward,
    }
    return appendLog(rewarded, 'Enemy destroyed. Salvage recovered.')
  }

  next.combat.enemyTarget = chooseEnemyTargetSystem(rng)
  const enemyVolley = fireVolley({
    weapons: next.combat.enemy.weapons,
    sourceLabel: 'Enemy',
    isPlayerSide: false,
    ammoPool: {},
    targetEntity: { ...next.player, hull: next.player.hull, shields: next.player.shields },
    targetSystems: next.combat.playerSystems,
    targetWeapons: next.player.weaponSlots,
    targetCrew: next.crew,
    targetSystem: next.combat.enemyTarget,
    targetDodgeBonus: pilotManeuverBonus(next),
  })
  next.combat.enemy.weapons = enemyVolley.updatedWeapons
  next.player.hull = enemyVolley.updatedEntity.hull
  next.player.shields = enemyVolley.updatedEntity.shields
  next.combat.playerSystems = enemyVolley.updatedSystems
  next.player.weaponSlots = enemyVolley.updatedTargetWeapons
  next.crew = enemyVolley.updatedTargetCrew
  next.combat.shots = [...(next.combat.shots || []).filter((shot) => nowTs - shot.startedAt < (shot.durationMs || 800) + 300), ...enemyVolley.shots]
  next.combat.feed = [...enemyVolley.messages, ...playerVolley.messages, ...reloadMessages, ...repairMessages, ...previousFeed].slice(0, 18)

  if (next.player.hull <= 0) {
    next.screen = 'gameover'
    next.combat = null
    return appendLog(next, 'The player ship was destroyed in combat.')
  }
  return next
}

function continueAfterCombat(run) {
  if (!run?.combat?.outcome) return run
  const next = deepClone(run)
  const outcome = next.combat.outcome
  next.screen = 'map'
  next.player.weaponSlots = (next.player.weaponSlots || []).map((weapon) => {
    if (!weapon) return null
    if ((weapon.hp || 0) <= 0 || weapon.broken) {
      return {
        ...weapon,
        hp: 0,
        broken: true,
        enabled: false,
        cooldownRemaining: 0,
        lastShotAt: 0,
        nextShotAt: 0,
      }
    }
    return {
      ...weapon,
      hp: weapon.maxHp,
      broken: false,
      cooldownRemaining: 0,
      lastShotAt: 0,
      nextShotAt: 0,
    }
  })
  next.crew = (next.crew || []).map((member) => ({ ...member, health: member.healthMax || 12 }))
  next.combat = null
  const brokenWeapons = next.player.weaponSlots.filter((weapon) => weapon?.broken)
  const resolved = brokenWeapons.length > 0 ? appendLog(next, `Post-combat damage report: ${brokenWeapons.map((weapon) => weapon.name).join(', ')} need repairs.`) : next
  return setEventOutcome(
    resolved,
    {
      title: outcome.kind === 'victory' ? 'Combat aftermath' : 'Combat resolved',
      text: outcome.kind === 'victory' ? 'The engagement has ended. Salvage and damage reports are available below.' : 'The engagement ended and the ship returned to normal operations.',
      tone: outcome.kind === 'victory' ? 'green' : 'cyan',
      details: [
        ...Object.entries(outcome.reward || {}).map(([key, value]) => outcomeDelta(key, value)),
        ...(brokenWeapons.length > 0 ? [outcomeStatus('repairs needed', brokenWeapons.map((weapon) => weapon.name).join(', '))] : [outcomeStatus('repairs needed', 'NONE')]),
      ],
    },
  )
}

function defaultUiState() {
  return {
    mainTerminal: 'system',
    legendOpen: false,
    mapScale: 1,
    mapCenter: { x: 180, y: 180 },
    travelAnimation: null,
    systemMotionStartAt: Date.now(),
    selectedCargoItemId: null,
    selectedCrewId: null,
    selectedNpcId: null,
    selectedWeaponSlotIndex: 0,
    selectedCombatWeaponIndex: null,
    selectedCombatWeaponSide: 'player',
    menuOpen: false,
    menuPanel: 'root',
    merchantOpen: false,
    merchantContext: null,
    merchantTab: 'buy',
    eventOutcome: null,
    view: 'ship',
    sheet: null,
  }
}

function normalizeWeaponInstances(weapons, fallbackLoadout = []) {
  if (!Array.isArray(weapons) || weapons.length === 0) return buildWeaponInstances(fallbackLoadout)
  return weapons
    .map((weapon, index) => buildWeaponInstance(weapon?.id, index, weapon || {}))
    .filter(Boolean)
}

function normalizeWeaponSlotArray(slotArray, fallbackLoadout = [], slotCount = fallbackLoadout.length || 1) {
  if (!Array.isArray(slotArray)) return buildWeaponSlotLayout(fallbackLoadout, slotCount)
  const normalizedSlots = Array.from({ length: slotCount }, (_, index) => {
    const weapon = slotArray[index]
    if (!weapon) return null
    return buildWeaponInstance(weapon?.id, index, weapon || {})
  })
  return normalizedSlots.some(Boolean) ? normalizedSlots : buildWeaponSlotLayout(fallbackLoadout, slotCount)
}

function normalizeRun(candidate) {
  if (!candidate || typeof candidate !== 'object') return null
  if (!candidate.player || !candidate.system || !Array.isArray(candidate.system.nodes) || candidate.system.nodes.length === 0) return null

  const next = deepClone(candidate)
  const shipClass = next.player.shipClass && SHIP_PRESETS[next.player.shipClass] ? next.player.shipClass : 'Scout'
  const preset = SHIP_PRESETS[shipClass]
  const setupDefaults = defaultSetupPrefs(shipClass)
  const weaponSlotCount = Math.max(1, Number(next.player.weaponSlotsMax) || preset.weaponSlots || preset.loadout.length)

  next.screen = ['map', 'combat_warning', 'combat', 'combat_hex', 'victory', 'gameover'].includes(next.screen) ? next.screen : 'map'
  next.systemIndex = Math.max(1, Number(next.systemIndex) || 1)
  next.turn = Math.max(0, Number(next.turn) || 0)
  next.log = Array.isArray(next.log) ? next.log.filter((entry) => typeof entry === 'string') : ['Save restored.']
  if (next.log.length === 0) next.log = [formatLogEntry(next.turn, 'Save restored.')]

  next.ui = { ...defaultUiState(), ...(next.ui || {}) }
  next.ui.mainTerminal = ['system', 'local', 'ship', 'crew', 'log'].includes(next.ui.mainTerminal) ? next.ui.mainTerminal : 'system'
  next.ui.view = next.ui.view === 'map' ? 'map' : 'ship'
  next.ui.sheet = ['here', 'loadout', 'crew', 'log', 'legend', 'info', 'menu'].includes(next.ui.sheet) ? next.ui.sheet : null
  next.ui.menuOpen = Boolean(next.ui.menuOpen)
  next.ui.menuPanel = ['root', 'options', 'dev'].includes(next.ui.menuPanel) ? next.ui.menuPanel : 'root'
  next.ui.mapScale = clamp(Number(next.ui.mapScale) || 1, 1, 4)
  const viewSize = 360 / next.ui.mapScale
  next.ui.mapCenter = {
    x: clamp(Number(next.ui.mapCenter?.x) || 180, viewSize / 2, 360 - viewSize / 2),
    y: clamp(Number(next.ui.mapCenter?.y) || 180, viewSize / 2, 360 - viewSize / 2),
  }

  next.resources = {
    fuel: Math.max(0, Number(next.resources?.fuel) || 0),
    reserveFuel: Math.max(0, Number(next.resources?.reserveFuel) || 0),
    scrap: Math.max(0, Number(next.resources?.scrap) || 0),
    parts: Math.max(0, Number(next.resources?.parts) || 0),
    credits: Math.max(0, Number(next.resources?.credits) || 0),
    kinetic_ammo: Math.max(0, Number(next.resources?.kinetic_ammo) || 0),
  }

  next.player = {
    ...next.player,
    shipClass,
    hullMax: Math.max(1, Number(next.player.hullMax) || preset.hullMax),
    shieldsMax: Math.max(0, Number(next.player.shieldsMax) || preset.shieldsMax),
    armourMax: Math.max(0, Number(next.player.armourMax ?? next.player.armour) || preset.armour),
    speed: Math.max(1, Number(next.player.speed) || preset.speed),
    maneuverability: Math.max(0, Number(next.player.maneuverability) || preset.maneuverability),
    stealth: Math.max(0, Number(next.player.stealth) || preset.stealth || 0),
    cargoCapacity: Math.max(1, Number(next.player.cargoCapacity) || preset.cargoCapacity),
    fuelCapacity: Math.max(1, Number(next.player.fuelCapacity) || preset.fuelCapacity),
    crewCapacity: Math.max(1, Number(next.player.crewCapacity) || preset.crewCapacity),
    weaponSlotsMax: weaponSlotCount,
    maxPower: Math.max(1, Number(next.player.maxPower) || preset.maxPower),
    value: Math.max(1, Number(next.player.value) || preset.value || 100),
    autoRepair: next.player.autoRepair !== false,
    autoReload: next.player.autoReload !== false,
  }
  next.shipName = sanitizeName(next.shipName, setupDefaults.shipName)
  next.playerName = sanitizeName(next.playerName, DEFAULT_PLAYER_NAME)
  next.playerWanted = Boolean(next.playerWanted)
  next.playerWantedReason = next.playerWanted ? sanitizeName(next.playerWantedReason, 'system crimes', 40) : null
  const legacyWeaponSlots = Array.isArray(next.player.weaponSlots) ? next.player.weaponSlots : normalizeWeaponInstances(next.player.weapons, preset.loadout)
  next.player.weaponSlots = normalizeWeaponSlotArray(legacyWeaponSlots, preset.loadout, weaponSlotCount)
  next.player.hull = clamp(Number.isFinite(Number(next.player.hull)) ? Number(next.player.hull) : next.player.hullMax, 0, next.player.hullMax)
  next.player.shields = clamp(Number.isFinite(Number(next.player.shields)) ? Number(next.player.shields) : next.player.shieldsMax, 0, next.player.shieldsMax)
  next.player.armour = clamp(Number.isFinite(Number(next.player.armour ?? next.player.armourMax)) ? Number(next.player.armour ?? next.player.armourMax) : next.player.armourMax, 0, next.player.armourMax)
  next.resources.fuel = clamp(next.resources.fuel, 0, next.player.fuelCapacity)

  next.cargo = Array.isArray(next.cargo)
    ? next.cargo
        .filter((item) => item?.itemId === 'Missile_Ammo' || EQUIPMENT_CATALOG[item?.itemId])
        .map((item) => ({
          ...item,
          id: item.id || createId('cargo'),
          level: equipmentLevel(item?.level),
          amount: Math.max(1, Number(item?.amount) || 1),
          missileLevel: equipmentLevel(item?.missileLevel || item?.level || 1),
          weaponState: isWeaponItemId(item?.itemId) && item?.weaponState ? buildWeaponInstance(item.itemId, 0, { ...item.weaponState, level: item.weaponState?.level || item?.level || 1 }) : undefined,
        }))
    : []
  const legacyMissiles = Math.max(0, Number(candidate?.resources?.missile_ammo) || 0)
  if (legacyMissiles > 0 && !next.cargo.some((item) => item.itemId === 'Missile_Ammo')) {
    let remainingMissiles = legacyMissiles
    while (remainingMissiles > 0) {
      next.cargo.push(buildMissileCargo(1, Math.min(MISSILE_CARGO_STACK, remainingMissiles)))
      remainingMissiles -= MISSILE_CARGO_STACK
    }
  }
  next.crew = Array.isArray(next.crew)
    ? next.crew
        .filter((member) => member && typeof member === 'object')
        .map((member) => ({
          ...member,
          id: member.id || createId('crew'),
          age: Math.max(0, Number(member.age) || 0),
          trait: typeof member.trait === 'string' && member.trait.trim() ? member.trait : 'steady under pressure',
          xp: Math.max(0, Number(member.xp) || 0),
          healthMax: Math.max(1, Number(member.healthMax) || (member.isChild ? 6 : 12)),
          health: clamp(Number.isFinite(Number(member.health)) ? Number(member.health) : (Number(member.healthMax) || (member.isChild ? 6 : 12)), 0, Math.max(1, Number(member.healthMax) || (member.isChild ? 6 : 12))),
          wanted: crewHasWantedStatus(member),
          wantedReason: crewHasWantedStatus(member) ? sanitizeName(member.wantedReason, 'outstanding warrant', 40) : null,
          skills: CREW_SKILL_IDS.reduce((acc, skillId) => {
            const normalized = skillState(member, skillId)
            if (normalized.level > 0 || Object.values(normalized.perks).some((value) => value > 0)) acc[skillId] = normalized
            return acc
          }, {}),
          alive: member.alive !== false,
        }))
    : []
  next.pendingAdvancements = Array.isArray(next.pendingAdvancements)
    ? next.pendingAdvancements.filter((entry) => entry && typeof entry.crewId === 'string' && Number(entry.level) >= 2).map((entry) => ({ id: entry.id || createId('crew_level'), crewId: entry.crewId, level: Math.max(2, Number(entry.level) || 2) }))
    : []

  next.system.type = SYSTEM_TYPES.includes(next.system.type) ? next.system.type : 'Civilised'
  const security = SYSTEM_SECURITY[next.system.type] || SYSTEM_SECURITY.Civilised
  next.system.systemNumber = Math.max(1, Number(next.system.systemNumber) || next.systemIndex)
  next.system.policePressure = Number.isFinite(next.system.policePressure) ? next.system.policePressure : security.police
  next.system.piratePressure = Number.isFinite(next.system.piratePressure) ? next.system.piratePressure : security.pirates
  next.system.securityAlert = Math.max(0, Number(next.system.securityAlert) || 0)
  next.system.crimeCount = Math.max(0, Number(next.system.crimeCount) || 0)
  next.system.candidatePreviews = Array.isArray(next.system.candidatePreviews) ? next.system.candidatePreviews : []
  // Saves made before the preview builder returned its result hold empty slots; rebuild them from the system seed.
  if ((next.systemIndex || 1) < MASTER.maxSystems && next.system.seed && (next.system.candidatePreviews.length < 4 || next.system.candidatePreviews.some((preview) => !preview))) {
    next.system.candidatePreviews = [1, 2, 3, 4].map((index) => buildNextPreview(`${next.system.seed}_candidate_${next.systemIndex || 1}_${index}`, (next.systemIndex || 1) + 1))
  }
  const existingDirections = Array.isArray(next.system.orbitDirections) ? next.system.orbitDirections : []
  const inferredDominantDirection = next.system.dominantDirection === -1 || next.system.dominantDirection === 1
    ? next.system.dominantDirection
    : (existingDirections.filter((direction) => Number(direction) < 0).length > MASTER.orbitCount / 2 ? -1 : 1)
  next.system.dominantDirection = inferredDominantDirection
  next.system.orbitDirections = MASTER.slotCounts.map(() => inferredDominantDirection)
  const existingOppositeIndex = existingDirections.findIndex((direction) => Number(direction) === -inferredDominantDirection)
  if (existingOppositeIndex >= 0) next.system.orbitDirections[existingOppositeIndex] = -inferredDominantDirection
  next.system.orbitStepShifts = buildOrbitStepShifts(makeRng(`${next.seed || next.system.seed || 'restore'}_orbit_${next.system.systemNumber}`), Array.isArray(next.system.orbitStepShifts) ? next.system.orbitStepShifts : DEFAULT_ORBIT_SPEEDS)
  next.system.orbitOffsets = MASTER.slotCounts.map((slotCount, orbit) => wrap(Math.round(Number(next.system.orbitOffsets?.[orbit]) || 0), slotCount))
  next.system.nodes = next.system.nodes
    .filter((node) => node && typeof node.id === 'string' && Number.isInteger(node.orbit) && Number.isInteger(node.slot))
    .map((node) => ({
      ...buildWaypoint(node.orbit, node.slot),
      ...node,
      stock: node.kind === 'merchant'
        ? (Array.isArray(node.stock)
            ? node.stock.filter((item) => item?.itemId === 'Missile_Ammo' || EQUIPMENT_CATALOG[item?.itemId]).map((item) => ({ ...item, id: item.id || createId('stock'), level: equipmentLevel(item?.level), missileLevel: equipmentLevel(item?.missileLevel || item?.level || 1), amount: Math.max(1, Number(item?.amount) || 1) }))
            : [])
        : undefined,
    }))
  if (next.system.nodes.length === 0) return null
  next.system.npcs = Array.isArray(next.system.npcs)
    ? next.system.npcs
        .filter((npc) => npc && typeof npc.id === 'string' && CONTACT_SHIP_META[npc.kind] && typeof npc.currentNodeId === 'string')
        .map((npc) => ({
          ...npc,
          stock: npc.kind === 'merchant'
            ? (Array.isArray(npc.stock)
                ? npc.stock.filter((item) => item?.itemId === 'Missile_Ammo' || EQUIPMENT_CATALOG[item?.itemId]).map((item) => ({ ...item, id: item.id || createId('stock'), level: equipmentLevel(item?.level), missileLevel: equipmentLevel(item?.missileLevel || item?.level || 1), amount: Math.max(1, Number(item?.amount) || 1) }))
                : [])
            : undefined,
          shipPrice: Math.max(12, Number(npc.shipPrice) || 12),
          speed: Math.max(1, Number(npc.speed) || 1),
          maneuverability: Math.max(0, Number(npc.maneuverability) || 0),
          stealth: Math.max(0, Number(npc.stealth) || 0),
          loadout: Array.isArray(npc.loadout) && npc.loadout.length > 0 ? npc.loadout.filter((weaponId) => WEAPONS[weaponId]) : (ENEMIES[CONTACT_SHIP_META[npc.kind].enemyKind]?.loadout || ['Laser_I']),
        }))
    : []
  if (next.system.npcs.length === 0) next.system.npcs = buildNpcTraffic(makeRng(`${next.seed || next.system.seed || 'restore'}_npc_${next.system.systemNumber}`), next.system)

  const nodeIds = new Set(next.system.nodes.map((node) => node.id))
  next.currentNodeId = nodeIds.has(next.currentNodeId) ? next.currentNodeId : next.system.nodes[0].id
  next.selectedNodeId = nodeIds.has(next.selectedNodeId) ? next.selectedNodeId : next.currentNodeId
  next.resources.reserveFuel = clamp(next.resources.reserveFuel, 0, reserveFuelCapacity(next))
  const cargoEntryKeys = new Set(buildCargoGridEntries(next).map((entry) => entry.key))
  next.ui.selectedCargoItemId = cargoEntryKeys.has(next.ui.selectedCargoItemId) ? next.ui.selectedCargoItemId : buildCargoGridEntries(next)[0]?.key || null
  const npcIds = new Set((next.system.npcs || []).map((npc) => npc.id))
  next.ui.selectedNpcId = npcIds.has(next.ui.selectedNpcId) ? next.ui.selectedNpcId : null
  next.ui.merchantContext = next.ui.merchantContext && npcIds.has(next.ui.merchantContext.id)
    ? { type: 'npc', id: next.ui.merchantContext.id }
    : (next.ui.merchantContext && nodeIds.has(next.ui.merchantContext.id) ? { type: 'node', id: next.ui.merchantContext.id } : null)
  next.ui.selectedWeaponSlotIndex = Number.isInteger(next.ui.selectedWeaponSlotIndex) ? clamp(next.ui.selectedWeaponSlotIndex, 0, Math.max(0, next.player.weaponSlotsMax - 1)) : null
  next.ui.selectedCombatWeaponIndex = Number.isInteger(next.ui.selectedCombatWeaponIndex) ? clamp(next.ui.selectedCombatWeaponIndex, 0, Math.max(0, next.player.weaponSlotsMax - 1)) : null
  next.ui.selectedCombatWeaponSide = next.ui.selectedCombatWeaponSide === 'enemy' ? 'enemy' : 'player'
  syncSelectedCrew(next)

  if (next.ui.travelAnimation) {
    const anim = next.ui.travelAnimation
    if (!nodeIds.has(anim.fromNodeId) || !nodeIds.has(anim.toNodeId)) next.ui.travelAnimation = null
  }

  if (!next.pendingEvent || !Array.isArray(next.pendingEvent.choices)) next.pendingEvent = null
  if (!next.ui.eventOutcome || typeof next.ui.eventOutcome !== 'object') next.ui.eventOutcome = null

  if (!next.combatWarning || typeof next.combatWarning !== 'object') {
    if (next.screen === 'combat_warning') next.screen = 'map'
    next.combatWarning = null
  } else {
    const enemyKind = ENEMIES[next.combatWarning.enemyKind] ? next.combatWarning.enemyKind : 'pirate'
    next.combatWarning = {
      ...next.combatWarning,
      enemyKind,
      title: next.combatWarning.title || 'Combat warning',
      description: next.combatWarning.description || 'Hostile ships are closing.',
      escapeChance: clamp(Number(next.combatWarning.escapeChance) || 0, 0, 0.95),
      demandChoices: Array.isArray(next.combatWarning.demandChoices) ? next.combatWarning.demandChoices : [],
      sourceNpcId: typeof next.combatWarning.sourceNpcId === 'string' ? next.combatWarning.sourceNpcId : null,
      enemy: next.combatWarning.enemy || buildEnemyCombatant(enemyKind),
    }
  }

  if (!next.combat?.enemy || !['combat', 'combat_hex'].includes(next.screen)) {
    if (next.screen === 'combat' || next.screen === 'combat_hex') next.screen = 'map'
    next.combat = ['combat', 'combat_hex'].includes(next.screen) ? next.combat : null
  } else if (next.screen === 'combat_hex' || next.combat?.mode === 'hex') {
    next.screen = 'combat_hex'
    next.combat = {
      ...next.combat,
      mode: 'hex',
      turnNumber: Math.max(1, Number(next.combat.turnNumber) || 1),
      phase: 'player',
      feed: Array.isArray(next.combat.feed) ? next.combat.feed.filter((entry) => typeof entry === 'string').slice(0, 18) : ['Tactical view restored.'],
      outcome: next.combat.outcome && typeof next.combat.outcome === 'object' ? next.combat.outcome : null,
      sourceNpcId: typeof next.combat.sourceNpcId === 'string' ? next.combat.sourceNpcId : null,
      squadronLimit: Math.max(1, Number(next.combat.squadronLimit) || DRONE_ACTIVE_LIMIT),
      droneBayCooldown: Math.max(0, Number(next.combat.droneBayCooldown) || 0),
      enemyDroneBayCooldown: Math.max(0, Number(next.combat.enemyDroneBayCooldown) || 0),
      autoCombat: Boolean(next.combat.autoCombat),
      effects: Array.isArray(next.combat.effects) ? next.combat.effects.filter((effect) => effect && typeof effect.id === 'string').slice(0, 12) : [],
      floaters: Array.isArray(next.combat.floaters) ? next.combat.floaters.filter((entry) => entry && typeof entry.id === 'string').slice(0, 24) : [],
      selectedHex: next.combat.selectedHex && hexWithinArena(next.combat.selectedHex) ? { col: next.combat.selectedHex.col, row: next.combat.selectedHex.row } : null,
      highlightedHexes: Array.isArray(next.combat.highlightedHexes) ? next.combat.highlightedHexes.filter((hex) => hex && hexWithinArena(hex)).map((hex) => ({ col: hex.col, row: hex.row })) : [],
      selectedUnitId: next.combat.selectedUnitId === null || typeof next.combat.selectedUnitId === 'string' ? next.combat.selectedUnitId : 'player_ship_unit',
      selectedTargetUnitId: typeof next.combat.selectedTargetUnitId === 'string' ? next.combat.selectedTargetUnitId : 'enemy_ship_unit',
      negotiation: next.combat.negotiation && typeof next.combat.negotiation === 'object'
        ? {
            side: next.combat.negotiation.side === 'enemy' ? 'enemy' : 'player',
            type: next.combat.negotiation.type || 'counteroffer',
            cost: {
              scrap: Math.max(0, Number(next.combat.negotiation.cost?.scrap) || 0),
              parts: Math.max(0, Number(next.combat.negotiation.cost?.parts) || 0),
              credits: Math.max(0, Number(next.combat.negotiation.cost?.credits) || 0),
              fuel: Math.max(0, Number(next.combat.negotiation.cost?.fuel) || 0),
            },
            text: String(next.combat.negotiation.text || ''),
          }
        : null,
    }
    next.combat.enemy.hullMax = Math.max(1, Number(next.combat.enemy.hullMax) || 1)
    next.combat.enemy.shieldsMax = Math.max(0, Number(next.combat.enemy.shieldsMax) || 0)
    next.combat.enemy.armourMax = Math.max(0, Number(next.combat.enemy.armourMax ?? next.combat.enemy.armour) || 0)
    next.combat.enemy.speed = Math.max(1, Number(next.combat.enemy.speed) || ENEMIES[next.combat.enemy.kind]?.speed || 1)
    next.combat.enemy.stealth = Math.max(0, Number(next.combat.enemy.stealth) || ENEMIES[next.combat.enemy.kind]?.stealth || 0)
    next.combat.enemy.hull = clamp(Number.isFinite(Number(next.combat.enemy.hull)) ? Number(next.combat.enemy.hull) : next.combat.enemy.hullMax, 0, next.combat.enemy.hullMax)
    next.combat.enemy.shields = clamp(Number.isFinite(Number(next.combat.enemy.shields)) ? Number(next.combat.enemy.shields) : next.combat.enemy.shieldsMax, 0, next.combat.enemy.shieldsMax)
    next.combat.enemy.armour = clamp(Number.isFinite(Number(next.combat.enemy.armour ?? next.combat.enemy.armourMax)) ? Number(next.combat.enemy.armour ?? next.combat.enemy.armourMax) : next.combat.enemy.armourMax, 0, next.combat.enemy.armourMax)
    next.combat.enemy.weapons = normalizeWeaponInstances(next.combat.enemy.weapons, ENEMIES[next.combat.enemy.kind]?.loadout || []).map((weapon, index) => weapon ? prepareWeaponForHexCombat(weapon, index) : null)
    next.combat.enemy.crew = Array.isArray(next.combat.enemy.crew) ? next.combat.enemy.crew.map((member) => ({ ...member, healthMax: Math.max(1, Number(member.healthMax) || 10), health: clamp(Number.isFinite(Number(member.health)) ? Number(member.health) : (Number(member.healthMax) || 10), 0, Math.max(1, Number(member.healthMax) || 10)) })) : buildEnemyCrew(next.combat.enemy.kind)
    next.player.weaponSlots = next.player.weaponSlots.map((weapon, index) => weapon ? prepareWeaponForHexCombat(weapon, index) : null)
    next.combat.playerShipUnit = buildHexShipUnit('player', { ...(next.combat.playerShipUnit || {}), actionsPerTurn: hexCombatShipMovePoints(playerSpeedValue(next)) })
    next.combat.enemyShipUnit = buildHexShipUnit('enemy', { ...(next.combat.enemyShipUnit || {}), actionsPerTurn: hexCombatShipMovePoints(next.combat.enemy.speed) })
    next.combat.squadrons = Array.isArray(next.combat.squadrons) ? next.combat.squadrons.map((squadron) => ({
      ...squadron,
      position: hexWithinArena(squadron.position || {}) ? { col: squadron.position.col, row: squadron.position.row } : hexCombatLaunchHex(squadron.side || 'player', squadron.side === 'player' ? next.combat.playerShipUnit : next.combat.enemyShipUnit),
      drones: Array.isArray(squadron.drones) ? squadron.drones.filter((drone) => drone && typeof drone === 'object').map((drone) => ({
        shield: clamp(Number(drone.shield) || 0, 0, 1),
        armour: clamp(Number(drone.armour) || 0, 0, 1),
        hull: clamp(Number(drone.hull) || 0, 0, 1),
      })) : Array.from({ length: DRONE_SQUADRON_SIZE }, () => buildDroneUnit()),
      actionsPerTurn: droneMoveRange(),
      actionsRemaining: clamp(Number.isFinite(Number(squadron.actionsRemaining)) ? Number(squadron.actionsRemaining) : droneMoveRange(), 0, droneMoveRange()),
      attackAvailable: squadron.attackAvailable !== false,
      movedThisTurn: Boolean(squadron.movedThisTurn),
      regenTick: Math.max(0, Number(squadron.regenTick) || 0),
      launchedTurn: Math.max(0, Number(squadron.launchedTurn) || 0),
    })).filter((squadron) => squadronAliveCount(squadron) > 0) : []
    if (next.combat.selectedUnitId && !isCombatUnitAlive(next, next.combat.selectedUnitId)) next.combat.selectedUnitId = next.combat.playerShipUnit.id
    if (!isCombatUnitAlive(next, next.combat.selectedTargetUnitId)) next.combat.selectedTargetUnitId = next.combat.enemyShipUnit.id
    ensureFleetState(next.combat)
  } else {
    next.combat.speed = [0, 2, 4, 6].includes(next.combat.speed) ? next.combat.speed : 2
    next.combat.feed = Array.isArray(next.combat.feed) ? next.combat.feed.filter((entry) => typeof entry === 'string').slice(0, 18) : ['Combat resumed.']
    next.combat.shots = Array.isArray(next.combat.shots) ? next.combat.shots : []
    next.combat.outcome = next.combat.outcome && typeof next.combat.outcome === 'object' ? next.combat.outcome : null
    next.combat.enemy.hullMax = Math.max(1, Number(next.combat.enemy.hullMax) || 1)
    next.combat.enemy.shieldsMax = Math.max(0, Number(next.combat.enemy.shieldsMax) || 0)
    next.combat.enemy.armourMax = Math.max(0, Number(next.combat.enemy.armourMax ?? next.combat.enemy.armour) || 0)
    next.combat.enemy.speed = Math.max(1, Number(next.combat.enemy.speed) || ENEMIES[next.combat.enemy.kind]?.speed || 1)
    next.combat.enemy.stealth = Math.max(0, Number(next.combat.enemy.stealth) || ENEMIES[next.combat.enemy.kind]?.stealth || 0)
    next.combat.enemy.hull = clamp(Number.isFinite(Number(next.combat.enemy.hull)) ? Number(next.combat.enemy.hull) : next.combat.enemy.hullMax, 0, next.combat.enemy.hullMax)
    next.combat.enemy.shields = clamp(Number.isFinite(Number(next.combat.enemy.shields)) ? Number(next.combat.enemy.shields) : next.combat.enemy.shieldsMax, 0, next.combat.enemy.shieldsMax)
    next.combat.enemy.armour = clamp(Number.isFinite(Number(next.combat.enemy.armour ?? next.combat.enemy.armourMax)) ? Number(next.combat.enemy.armour ?? next.combat.enemy.armourMax) : next.combat.enemy.armourMax, 0, next.combat.enemy.armourMax)
    next.combat.enemy.weapons = normalizeWeaponInstances(next.combat.enemy.weapons, ENEMIES[next.combat.enemy.kind]?.loadout || [])
    next.combat.enemy.crew = Array.isArray(next.combat.enemy.crew) ? next.combat.enemy.crew.map((member) => ({ ...member, healthMax: Math.max(1, Number(member.healthMax) || 10), health: clamp(Number.isFinite(Number(member.health)) ? Number(member.health) : (Number(member.healthMax) || 10), 0, Math.max(1, Number(member.healthMax) || 10)) })) : buildEnemyCrew(next.combat.enemy.kind)
    next.combat.playerTarget = (COMBAT_TARGETS.some((target) => target.id === next.combat.playerTarget) || String(next.combat.playerTarget || '').startsWith('weapon:')) ? next.combat.playerTarget : 'hull'
    next.combat.enemyTarget = COMBAT_TARGETS.some((target) => target.id === next.combat.enemyTarget) ? next.combat.enemyTarget : 'hull'
    next.combat.playerSystems = { shieldLayersDisabled: Math.max(0, Number(next.combat.playerSystems?.shieldLayersDisabled) || 0), engineDamage: Math.max(0, Number(next.combat.playerSystems?.engineDamage) || 0) }
    next.combat.enemySystems = { shieldLayersDisabled: Math.max(0, Number(next.combat.enemySystems?.shieldLayersDisabled) || 0), engineDamage: Math.max(0, Number(next.combat.enemySystems?.engineDamage) || 0) }
    next.combat.repairQueue = Array.isArray(next.combat.repairQueue) ? next.combat.repairQueue.filter((entry) => typeof entry === 'string') : []
    next.combat.sourceNpcId = typeof next.combat.sourceNpcId === 'string' ? next.combat.sourceNpcId : null
    next.player.weaponSlots = next.player.weaponSlots.map((weapon, index) => weapon ? buildWeaponInstance(weapon.id, index, { ...weapon, targetId: weapon.targetId || 'hull', autoReload: weapon.autoReload ?? next.player.autoReload }) : null)
  }

  return next
}

function resetSystemMap(next) {
  next.ui.mapScale = 1
  next.ui.mapCenter = { x: 180, y: 180 }
  return next
}

function setMainTerminal(run, mainTerminal) {
  const next = deepClone(run)
  next.ui.mainTerminal = mainTerminal
  return next
}

function setMerchantOpen(run, merchantOpen) {
  const next = deepClone(run)
  next.ui.merchantOpen = merchantOpen
  if (!merchantOpen) {
    next.ui.merchantTab = 'buy'
    next.ui.merchantContext = null
  }
  return next
}

function setMerchantTab(run, merchantTab) {
  const next = deepClone(run)
  next.ui.merchantTab = merchantTab
  next.ui.merchantOpen = true
  return next
}

function selectCargoItem(run, cargoItemId) {
  const next = deepClone(run)
  next.ui.selectedCargoItemId = cargoItemId
  next.ui.selectedWeaponSlotIndex = null
  return next
}

function selectCrewMember(run, crewId) {
  const next = deepClone(run)
  next.ui.selectedCrewId = crewId
  return next
}

function selectNpcShip(run, npcId) {
  const next = deepClone(run)
  next.ui.selectedNpcId = npcId
  return next
}

function currentPendingAdvancement(run) {
  return (run?.pendingAdvancements || []).find((entry) => run.crew.some((member) => member.id === entry.crewId)) || null
}

function resolveCrewAdvancement(run, skillId, perkId) {
  const prompt = currentPendingAdvancement(run)
  if (!prompt || !CREW_SKILL_DEFS[skillId]) return run
  const next = deepClone(run)
  const crewIndex = next.crew.findIndex((member) => member.id === prompt.crewId)
  if (crewIndex < 0) return next
  next.crew[crewIndex] = applyCrewSkillChoice(next.crew[crewIndex], skillId, perkId)
  next.ui.selectedCrewId = next.crew[crewIndex].id
  next.pendingAdvancements = (next.pendingAdvancements || []).filter((entry) => entry.id !== prompt.id)
  const skillLevel = crewSkillLevel(next.crew[crewIndex], skillId)
  return appendLog(next, `${next.crew[crewIndex].name} advanced ${skillLabel(skillId)} to level ${skillLevel} and improved ${perkLabel(skillId, perkId)}.`)
}

function crewRoleLabel(role) {
  return String(role || 'crew').replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase())
}

function crewDescription(member) {
  if (!member) return ''
  if (member.isChild) return `A dependent travelling aboard the ship. ${member.name} is ${member.trait || 'quietly observant'} and entirely dependent on the crew for safety.`
  const roleCopy = {
    pilot: 'Keeps the ship aligned through rotating lanes, contested approaches, and tight burn windows.',
    repair: 'Keeps failing systems running with field repairs, jury-rigged replacements, and patience.',
    diplomat: 'Handles dockside negotiations, tense inspections, and any conversation that could turn expensive.',
    salvager: 'Turns wrecks, debris fields, and abandoned cargo into something the ship can actually use.',
    hacker: 'Cuts through relays, automated locks, and machine scrutiny from behind the terminal stack.',
  }
  return `${roleCopy[member.role] || 'An experienced spacer keeping the ship operational.'} Known aboard for being ${member.trait || 'steady under pressure'}.`
}

function isDockedAtCardinalBase(node) {
  return node?.kind === 'base_arrival' || node?.kind === 'base_departure'
}

function removeCrewMember(run, crewId) {
  const next = deepClone(run)
  const crewIndex = next.crew.findIndex((member) => member.id === crewId)
  if (crewIndex < 0) return next
  const [member] = next.crew.splice(crewIndex, 1)
  const dockedAtBase = isDockedAtCardinalBase(findNode(next.system, next.currentNodeId))
  syncSelectedCrew(next)
  return appendLog(next, dockedAtBase
    ? `${member.name} disembarked at a Cardinal space station.`
    : `${member.name} was forced off the ship away from a Cardinal base and did not survive.`)
}

function selectWeaponSlot(run, slotIndex) {
  const next = deepClone(run)
  next.ui.selectedWeaponSlotIndex = slotIndex
  return next
}

function moveWeaponBetweenSlots(run, fromIndex, toIndex) {
  if (fromIndex === toIndex) return run
  const next = deepClone(run)
  const fromWeapon = next.player.weaponSlots[fromIndex]
  if (!fromWeapon) return next
  const targetWeapon = next.player.weaponSlots[toIndex]
  next.player.weaponSlots[toIndex] = fromWeapon
  next.player.weaponSlots[fromIndex] = targetWeapon || null
  next.ui.selectedWeaponSlotIndex = toIndex
  return next
}

function moveWeaponSlotToCargo(run, slotIndex) {
  const next = deepClone(run)
  const weapon = next.player.weaponSlots?.[slotIndex]
  if (!weapon) return next
  const definition = EQUIPMENT_CATALOG[weapon.id]
  if (!definition) return next
  if (cargoFree(next) < (definition.size || 1)) return appendLog(next, 'No free cargo space to stow that weapon.')
  next.player.weaponSlots[slotIndex] = null
  const cargoItem = buildCargoItem(weapon.id, weapon)
  next.cargo.push(cargoItem)
  next.ui.selectedCargoItemId = cargoItem.id
  next.ui.selectedWeaponSlotIndex = slotIndex
  return appendLog(next, `${definition.name} was moved from the weapon mount into cargo.`)
}

function moveCargoWeaponToSlot(run, cargoItemId, slotIndex) {
  const next = deepClone(run)
  const cargoIndex = next.cargo.findIndex((item) => item.id === cargoItemId)
  if (cargoIndex < 0) return next
  const cargoItem = next.cargo[cargoIndex]
  if (!isWeaponItemId(cargoItem.itemId)) return appendLog(next, 'Only weapon crates can be installed into weapon slots.')
  const targetWeapon = next.player.weaponSlots?.[slotIndex] || null
  const incomingPower = equipmentPowerDraw(cargoItem.itemId)
  const outgoingPower = targetWeapon && targetWeapon.enabled !== false && !targetWeapon.broken ? equipmentPowerDraw(targetWeapon.id) : 0
  const projectedPower = currentPowerUsage(next) - outgoingPower + incomingPower
  if (projectedPower > next.player.maxPower) return appendLog(next, `Installing that weapon would exceed ship power capacity (${projectedPower}/${next.player.maxPower}).`)
  if (targetWeapon) {
    const targetDefinition = EQUIPMENT_CATALOG[targetWeapon.id]
    const releasedCargoSpace = EQUIPMENT_CATALOG[cargoItem.itemId]?.size || 1
    if (cargoFree(next) + releasedCargoSpace < (targetDefinition?.size || 1)) return appendLog(next, 'No free cargo space to remove the currently equipped weapon.')
    next.cargo.push(buildCargoItem(targetWeapon.id, targetWeapon))
  }
  next.cargo.splice(cargoIndex, 1)
  next.player.weaponSlots[slotIndex] = buildWeaponInstance(cargoItem.itemId, slotIndex, { ...(cargoItem.weaponState || {}), level: cargoItem.level || cargoItem.weaponState?.level || 1, autoReload: cargoItem.weaponState?.autoReload ?? next.player.autoReload, enabled: !(cargoItem.weaponState?.broken), cooldownRemaining: 0, instanceId: createId(`weapon_${cargoItem.itemId}`) })
  syncSelectedCargoEntry(next)
  next.ui.selectedWeaponSlotIndex = slotIndex
  return appendLog(next, `${EQUIPMENT_CATALOG[cargoItem.itemId].name} was installed into weapon slot ${slotIndex + 1}.`)
}

function dismissEventOutcome(run) {
  const next = deepClone(run)
  next.ui.eventOutcome = null
  return next
}

function setMenuOpen(run, menuOpen) {
  const next = deepClone(run)
  next.ui.menuOpen = menuOpen
  if (!menuOpen) next.ui.menuPanel = 'root'
  return next
}

function setMenuPanel(run, menuPanel) {
  const next = deepClone(run)
  next.ui.menuOpen = true
  next.ui.menuPanel = menuPanel
  return next
}

function devGrantResources(run) {
  const next = deepClone(run)
  next.resources.scrap += 40
  next.resources.parts += 20
  next.resources.credits += 150
  addFuel(next, 8)
  return appendLog(next, 'Developer option: granted scrap, parts, credits, and fuel.')
}

function devRestoreShip(run) {
  const next = deepClone(run)
  next.player.hull = next.player.hullMax
  next.player.shields = next.player.shieldsMax
  next.player.armour = next.player.armourMax
  next.player.weaponSlots = (next.player.weaponSlots || []).map((weapon, index) => weapon ? buildWeaponInstance(weapon.id, index, { ...weapon, hp: weapon.maxHp, broken: false, enabled: true }) : null)
  next.crew = (next.crew || []).map((member) => ({ ...member, health: member.healthMax || 12 }))
  return appendLog(next, 'Developer option: restored ship, weapons, and crew.')
}

function devForceCombatVictory(run) {
  if (!run?.combat || run.screen !== 'combat_hex' || run.combat.outcome) return run
  const next = deepClone(run)
  next.combat.enemy.hull = 0
  next.combat.feed = ['Developer: Forced combat victory.', ...(next.combat.feed || [])].slice(0, 18)
  return awardHexCombatVictory(next)
}

function abandonRunToMenu(setRun) {
  try {
    localStorage.removeItem(MASTER.saveKey)
  } catch {
    // ignore storage errors
  }
  setRun(null)
}

function toggleLegend(run) {
  const next = deepClone(run)
  next.ui.legendOpen = !next.ui.legendOpen
  return next
}

function zoomMap(run, delta) {
  const next = deepClone(run)
  next.ui.mapScale = clamp(Number((next.ui.mapScale + delta).toFixed(2)), 1, 4)
  const size = 360 / next.ui.mapScale
  next.ui.mapCenter.x = clamp(next.ui.mapCenter.x, size / 2, 360 - size / 2)
  next.ui.mapCenter.y = clamp(next.ui.mapCenter.y, size / 2, 360 - size / 2)
  return next
}

function getMapViewBox(ui) {
  const size = 360 / ui.mapScale
  const x = clamp(ui.mapCenter.x - size / 2, 0, 360 - size)
  const y = clamp(ui.mapCenter.y - size / 2, 0, 360 - size)
  return `${x} ${y} ${size} ${size}`
}

function touchPoint(touch) { return { x: touch.clientX, y: touch.clientY } }
function touchDistance(a, b) { const dx = a.clientX - b.clientX; const dy = a.clientY - b.clientY; return Math.hypot(dx, dy) }
function getTouchMidpoint(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 } }
function hasMiningLaser(run) { return equippedWeapons(run.player).some((weapon) => weapon.id === 'Mining_Laser' && !weapon.broken) }

function repairHull(run) {
  const next = deepClone(run)
  if (next.resources.parts < 2 || next.resources.scrap < 4) return next
  if (next.player.hull >= next.player.hullMax) return next
  next.resources.parts -= 2
  next.resources.scrap -= 4
  next.player.hull = Math.min(next.player.hullMax, next.player.hull + 16)
  awardCrewXp(next, 2, (member) => member.role === 'repair')
  return appendLog(next, 'Hull repaired at local facilities.')
}

function rechargeShields(run) {
  const next = deepClone(run)
  if (next.resources.parts < 1) return next
  if (next.player.shields >= next.player.shieldsMax) return next
  next.resources.parts -= 1
  next.player.shields = Math.min(next.player.shieldsMax, next.player.shields + 10)
  awardCrewXp(next, 1, (member) => member.role === 'repair' || member.role === 'hacker')
  return appendLog(next, 'Shields retuned.')
}

function refuelShip(run) {
  const next = deepClone(run)
  if (next.resources.scrap < 6) return appendLog(next, 'Not enough scrap to refuel the ship.')
  if (next.resources.fuel >= next.player.fuelCapacity && reserveFuelAmount(next) >= reserveFuelCapacity(next)) return appendLog(next, 'Fuel tanks and reserve cargo cells are already full.')
  next.resources.scrap -= 6
  const { accepted, tankAdded, reserveAdded } = addFuel(next, 6)
  if (accepted <= 0) return appendLog(next, 'No storage space was available for additional fuel.')
  awardCrewXp(next, 1, (member) => member.role === 'pilot' || member.role === 'repair')
  return appendLog(next, `Refuelled the ship: +${tankAdded} tank fuel${reserveAdded > 0 ? `, +${reserveAdded} reserve fuel` : ''}.`)
}

function recruitCrew(run) {
  const next = deepClone(run)
  if (next.resources.scrap < 10) return appendLog(next, 'Not enough scrap to recruit a new crew member.')
  if (crewAtCapacity(next)) return appendLog(next, 'Crew berths are full. No additional crew can board this ship.')
  const rng = makeRng(`${next.seed}_recruit_${next.turn}_${next.crew.length}`)
  next.resources.scrap -= 10
  next.crew.push(buildCrew(rng, false))
  syncSelectedCrew(next)
  return appendLog(next, 'A new crew member joined the ship.')
}

function salvageSupplyDepot(run) {
  const next = deepClone(run)
  const nodeIndex = next.system.nodes.findIndex((node) => node.id === next.currentNodeId)
  const node = nodeIndex >= 0 ? next.system.nodes[nodeIndex] : null
  if (!node || node.kind !== 'depot') return next
  if (node.salvaged) return appendLog(next, 'This supply depot has already been stripped of anything useful.')

  const rng = makeRng(`${next.seed}_depot_${next.system.systemNumber}_${next.turn}_${node.id}`)
  const partsFound = rng.int(2, 5)
  const scrapFound = rng.int(3, 8)
  const fuelFound = rng.int(1, 4)

  node.salvaged = true
  next.resources.parts += partsFound
  next.resources.scrap += scrapFound
  const fuelResult = addFuel(next, fuelFound)
  awardCrewXp(next, 1)
  awardCrewXp(next, 2, (member) => member.role === 'salvager' || crewSkillLevel(member, 'repair_specialist') > 0)

  const detailParts = [outcomeDelta('parts', partsFound), outcomeDelta('scrap', scrapFound)]
  if (fuelResult.accepted > 0) detailParts.push(outcomeDelta('fuel', fuelResult.accepted))
  if (fuelResult.accepted < fuelFound) detailParts.push(outcomeStatus('storage', `FULL ${fuelFound - fuelResult.accepted} FUEL LOST`))

  return setEventOutcome(
    appendLog(next, `Salvaged the supply depot: +${partsFound} parts, +${scrapFound} scrap${fuelResult.accepted > 0 ? `, +${fuelResult.accepted} fuel` : ''}.`),
    {
      title: 'Supply depot salvaged',
      text: 'The depot still held some emergency stores and salvageable systems.',
      tone: 'amber',
      details: detailParts,
    },
  )
}

function probeAnomaly(run) {
  const next = deepClone(run)
  const node = next.system.nodes.find((entry) => entry.id === next.currentNodeId && entry.kind === 'anomaly')
  if (!node) return next
  if (node.spent) return appendLog(next, 'This anomaly has already been probed as far as it can be safely pushed.')
  const rng = makeRng(`${next.seed}_probe_anomaly_${next.system.systemNumber}_${next.turn}_${node.id}`)
  node.spent = true
  awardCrewXp(next, 1)
  awardCrewXp(next, 2, (member) => member.role === 'hacker' || crewSkillLevel(member, 'pilot') > 0)
  if (rng.chance(0.58)) {
    const shieldGain = rng.int(6, 10)
    next.player.shields = Math.min(next.player.shieldsMax, next.player.shields + shieldGain)
    return setEventOutcome(
      appendLog(next, `The anomaly probe reinforced the shield lattice by ${shieldGain}.`),
      { title: 'Anomaly probe successful', text: 'The irregular field fed energy back into the shield mesh.', tone: 'cyan', details: [outcomeDelta('shields', shieldGain)] },
    )
  }
  const hullLoss = rng.int(4, 7)
  next.player.hull = Math.max(1, next.player.hull - hullLoss)
  return setEventOutcome(
    appendLog(next, `The anomaly buckled hull panels during the probe. Hull -${hullLoss}.`),
    { title: 'Anomaly probe destabilized', text: 'The readings were real, but the field kicked back hard against the hull.', tone: 'rose', details: [outcomeDelta('hull', -hullLoss)] },
  )
}

function queryNavigationRelay(run) {
  const next = deepClone(run)
  const node = next.system.nodes.find((entry) => entry.id === next.currentNodeId && entry.kind === 'relay')
  if (!node) return next
  if (node.spent) return appendLog(next, 'This relay already pushed all useful traffic data to your ship.')
  node.spent = true
  const alertDrop = Math.min(next.system.securityAlert || 0, 1)
  next.system.securityAlert = Math.max(0, (next.system.securityAlert || 0) - 1)
  awardCrewXp(next, 1)
  awardCrewXp(next, 2, (member) => member.role === 'hacker' || crewSkillLevel(member, 'pilot') > 0)
  const contacts = (next.system.npcs || []).map((npc) => `${CONTACT_SHIP_META[npc.kind].label} at ${findNode(next.system, npc.currentNodeId)?.label || 'unknown waypoint'}`).slice(0, 3)
  return setEventOutcome(
    appendLog(next, 'Downloaded route data and fresh traffic intelligence from the relay.'),
    {
      title: 'Relay data acquired',
      text: 'The relay delivered route chatter, traffic IDs, and updated lane predictions.',
      tone: 'green',
      details: [
        ...(alertDrop > 0 ? [outcomeDelta('police alert', -alertDrop)] : [outcomeStatus('police alert', 'NO CHANGE')]),
        ...(contacts.length > 0 ? contacts.map((entry) => outcomeStatus('traffic', entry)) : [outcomeStatus('traffic', 'NO ACTIVE SHIPS LISTED')]),
      ],
    },
  )
}

function buyMerchantItem(run, merchantId, stockId) {
  const next = deepClone(run)
  const merchantSource = merchantSourceById(next.system, merchantId)
  const merchant = merchantSource?.entity
  if (!merchant?.stock?.length) return next
  const stockIndex = merchant.stock.findIndex((item) => item.id === stockId)
  if (stockIndex < 0) return next
  const stockItem = merchant.stock[stockIndex]
  const definition = EQUIPMENT_CATALOG[stockItem.itemId]
  if (!definition) return next
  if (next.resources.credits < stockItem.price) return appendLog(next, 'Not enough credits to buy that equipment.')
  if (cargoFree(next) < (definition.size || 1)) return appendLog(next, 'No free cargo space for that equipment.')
  next.resources.credits -= stockItem.price
  const cargoItem = stockItem.itemId === 'Missile_Ammo'
    ? buildMissileCargo(stockItem.missileLevel || stockItem.level || 1, stockItem.amount || MISSILE_CARGO_STACK)
    : buildCargoItem(stockItem.itemId, null, { level: stockItem.level || 1 })
  next.cargo.push(cargoItem)
  next.ui.selectedCargoItemId = cargoItem.id
  merchant.stock.splice(stockIndex, 1)
  return appendLog(next, `Bought ${stockItem.itemId === 'Missile_Ammo' ? `level ${equipmentLevel(stockItem.missileLevel || stockItem.level)} missiles` : `${definition.name} ${equipmentLevelSuffix(stockItem.level || 1)}`} for ${stockItem.price} credits.`)
}

function sellCargoItem(run, merchantId, cargoItemId) {
  const next = deepClone(run)
  const merchantSource = merchantSourceById(next.system, merchantId)
  const merchant = merchantSource?.entity
  if (!merchant) return next
  const cargoIndex = next.cargo.findIndex((item) => item.id === cargoItemId)
  if (cargoIndex < 0) return next
  const [cargoItem] = next.cargo.splice(cargoIndex, 1)
  const definition = EQUIPMENT_CATALOG[cargoItem.itemId]
  if (!definition) return next
  const salePrice = Math.max(3, Math.floor(equipmentPrice(definition, cargoItem.level || cargoItem.missileLevel || 1) * 0.65))
  next.resources.credits += salePrice
  merchant.stock = merchant.stock || []
  merchant.stock.push({
    id: createId(`stock_resold_${cargoItem.itemId}`),
    itemId: cargoItem.itemId,
    level: equipmentLevel(cargoItem.level || cargoItem.weaponState?.level || 1),
    missileLevel: equipmentLevel(cargoItem.missileLevel || cargoItem.level || 1),
    amount: Math.max(1, Number(cargoItem.amount) || MISSILE_CARGO_STACK),
    price: Math.max(salePrice + 2, equipmentPrice(definition, cargoItem.level || cargoItem.missileLevel || 1)),
  })
  if (next.ui.selectedCargoItemId === cargoItemId) next.ui.selectedCargoItemId = buildCargoGridEntries(next)[0]?.key || null
  return appendLog(next, `Sold ${definition.name}${cargoItem.itemId === 'Missile_Ammo' ? ` crate (${cargoItem.amount} missiles)` : ''} for ${salePrice} credits.`)
}

function buyShipAtShipyard(run, shipClass) {
  const next = deepClone(run)
  const currentNode = findNode(next.system, next.currentNodeId)
  if (currentNode.kind !== 'shipyard') return next
  const preset = SHIP_PRESETS[shipClass]
  if (!preset) return next
  if (shipClass === next.player.shipClass) return appendLog(next, 'This yard already has your current hull class in service.')
  if ((next.crew || []).length > preset.crewCapacity) return appendLog(next, `${shipClass} does not have enough crew berths for the current complement.`)
  if (cargoUsed(next) > preset.cargoCapacity) return appendLog(next, `${shipClass} cannot carry the current cargo load.`)
  if (equippedWeapons(next.player).length > preset.weaponSlots) return appendLog(next, `${shipClass} does not have enough weapon slots for the currently mounted weapons.`)
  if (currentPowerUsage(next) > preset.maxPower) return appendLog(next, `${shipClass} cannot support the currently powered equipment load.`)
  const tradeIn = Math.max(0, next.player.value || 0)
  const totalPrice = Math.max(0, preset.value - tradeIn)
  if ((next.resources.credits || 0) < totalPrice) return appendLog(next, `${shipClass} requires ${totalPrice} credits after trade-in.`)
  next.resources.credits -= totalPrice
  const equipped = next.player.weaponSlots.filter(Boolean).map((weapon, index) => buildWeaponInstance(weapon.id, index, weapon))
  next.player = {
    ...next.player,
    shipClass,
    hullMax: preset.hullMax,
    hull: preset.hullMax,
    shieldsMax: preset.shieldsMax,
    shields: preset.shieldsMax,
    armourMax: preset.armour,
    armour: preset.armour,
    speed: preset.speed,
    maneuverability: preset.maneuverability,
    stealth: preset.stealth,
    cargoCapacity: preset.cargoCapacity,
    fuelCapacity: preset.fuelCapacity,
    crewCapacity: preset.crewCapacity,
    weaponSlotsMax: preset.weaponSlots,
    maxPower: preset.maxPower,
    value: preset.value,
    weaponSlots: Array.from({ length: preset.weaponSlots }, (_, index) => equipped[index] || null),
  }
  next.resources.fuel = clamp(next.resources.fuel, 0, next.player.fuelCapacity)
  next.resources.reserveFuel = clamp(next.resources.reserveFuel, 0, reserveFuelCapacity(next))
  next.ui.selectedWeaponSlotIndex = 0
  next.ui.selectedCombatWeaponIndex = null
  syncSelectedCargoEntry(next)
  return setEventOutcome(
    appendLog(next, `Traded into a ${shipClass} hull for ${totalPrice} credits after ${tradeIn} credits trade-in value.`),
    {
      title: 'Ship refit completed',
      text: `The yard transferred your crew into a ${shipClass} and completed the hull handover.`,
      tone: 'green',
      details: [
        outcomeStatus('trade-in', `${tradeIn} CREDITS`),
        outcomeStatus('price per unit', `${preset.value} CREDITS`),
        outcomeDelta('credits', -totalPrice),
      ],
    },
  )
}

function upgradeMountedWeaponAtShipyard(run, slotIndex) {
  const next = deepClone(run)
  const currentNode = findNode(next.system, next.currentNodeId)
  if (currentNode.kind !== 'shipyard') return next
  const weapon = next.player.weaponSlots?.[slotIndex]
  if (!weapon) return next
  if (equipmentLevel(weapon.level) >= 5) return appendLog(next, `${weapon.name} is already at epic specification.`)
  const targetLevel = equipmentLevel((weapon.level || 1) + 1)
  const creditCost = 22 + targetLevel * 12
  const partsCost = 2 + targetLevel
  if ((next.resources.credits || 0) < creditCost || (next.resources.parts || 0) < partsCost) {
    return appendLog(next, `Upgrading weapon slot ${slotIndex + 1} requires ${creditCost} credits and ${partsCost} parts.`)
  }
  next.resources.credits -= creditCost
  next.resources.parts -= partsCost
  next.player.weaponSlots[slotIndex] = buildWeaponInstance(weapon.id, slotIndex, {
    ...weapon,
    level: targetLevel,
    hp: weaponStatsForLevel(WEAPONS[weapon.id], targetLevel).hpMax,
    broken: false,
    enabled: true,
  })
  return setEventOutcome(
    appendLog(next, `Upgraded weapon slot ${slotIndex + 1} to ${next.player.weaponSlots[slotIndex].name}.`),
    {
      title: 'Weapon upgrade completed',
      text: 'The construction station refitted the mounted weapon and recalibrated the fire-control package.',
      tone: 'cyan',
      details: [outcomeDelta('credits', -creditCost), outcomeDelta('parts', -partsCost), outcomeStatus('upgrade', next.player.weaponSlots[slotIndex].name)],
    },
  )
}

function mineAsteroidBelt(run) {
  const node = findNode(run.system, run.currentNodeId)
  if (node.kind !== 'belt' || !hasMiningLaser(run)) return run
  let next = deepClone(run)
  if (totalFuelAvailable(next) < 1) return appendLog(next, 'Mining requires at least 1 fuel for positioning thrusters.')
  const scrapGain = scaleScrapGain(12, scrapperBonus(next, 'mining_yield'))
  next.turn += 1
  awardCrewXp(next, 1)
  awardCrewXp(next, 2, (member) => member.role === 'salvager' || member.role === 'repair')
  spendFuel(next, 1)
  next.resources.scrap += scrapGain
  next.resources.parts += 5
  next.system = advanceOrbitOffsets(next.system)
  next = registerCrime(next, 'unlicensed asteroid extraction', 1)
  if (Math.random() < 0.2) {
    next.player.hull = Math.max(1, next.player.hull - 4)
    next = maybeTriggerSecurityEncounter(next, next.currentNodeId, next.currentNodeId, 'wait')
    return appendLog(next, `Asteroid mining recovered +${scrapGain} scrap and +5 parts. Fuel -1, hull -4.`)
  }
  next = maybeTriggerSecurityEncounter(next, next.currentNodeId, next.currentNodeId, 'wait')
  return appendLog(next, `Asteroid mining recovered +${scrapGain} scrap and +5 parts. Fuel -1.`)
}

function travelToNextSystem(run, departureIndex) {
  let next = deepClone(run)
  if (next.systemIndex === MASTER.maxSystems) {
    next.screen = 'victory'
    return appendLog(next, 'The tenth system was completed. Victory achieved.')
  }
  const preview = next.system.candidatePreviews[departureIndex]
  if (!preview) return next
  const fuelCost = interstellarFuelCost(preview)
  if (totalFuelAvailable(next) < fuelCost) return appendLog(next, `Interstellar travel requires ${fuelCost} fuel.`)
  next.turn += 1
  awardCrewXp(next, 2)
  awardCrewXp(next, 1, (member) => member.role === 'pilot')
  spendFuel(next, fuelCost)
  next.systemIndex += 1
  next.system = buildSystem(preview.seed, next.systemIndex, departureIndex)
  const arrivalBase = next.system.nodes.find((node) => node.kind === 'base_arrival')
  next.currentNodeId = arrivalBase?.id || next.system.nodes[0].id
  next.selectedNodeId = next.currentNodeId
  next.screen = 'map'
  next.ui = defaultUiState()
  next.pendingEvent = null
  next.log = [formatLogEntry(next.turn, `Arrived in ${next.system.name}. Interstellar transit consumed ${fuelCost} fuel.`), ...(next.log || [])]
  next = maybeTriggerSecurityEncounter(next, next.currentNodeId, next.currentNodeId, 'arrival')
  return next
}

function orbitForecast(system, node, turns = 3) {
  const slotCount = MASTER.slotCounts[node.orbit]
  const currentGlobalSlot = wrap(node.slot + system.orbitOffsets[node.orbit], slotCount)
  return { slotCount, currentGlobalSlot, futureSlots: Array.from({ length: turns }, (_, index) => wrap(currentGlobalSlot + system.orbitDirections[node.orbit] * system.orbitStepShifts[node.orbit] * (index + 1), slotCount)) }
}

function startTravelAnimation(run, targetNodeId, mode = 'normal') {
  if (!run || run.screen !== 'map' || run.pendingEvent || run.ui?.eventOutcome || currentPendingAdvancement(run)) return run
  const current = findNode(run.system, run.currentNodeId)
  const target = findNode(run.system, targetNodeId)
  const reachable = getReachableNodeIds(run)
  if (mode === 'normal' && !reachable.has(targetNodeId)) return run
  if (mode === 'meteor') {
    if (!run.system.meteorPath || !nodeOnMeteorPath(run.system, current, run.system.meteorPath) || !nodeOnMeteorPath(run.system, target, run.system.meteorPath) || current.id === target.id) return run
  }
  const fuelCost = fuelCostForDistance(run, nodeDistance(run.system, current, target), mode === 'normal' ? 'travel' : mode)
  if (totalFuelAvailable(run) < fuelCost) return appendLog(run, `Not enough fuel. This manoeuvre requires ${fuelCost} fuel.`)
  const next = deepClone(run)
  next.ui.travelAnimation = {
    mode,
    fromNodeId: current.id,
    toNodeId: target.id,
    startAt: Date.now(),
    durationMs: mode === 'meteor' ? 1800 : mode === 'wait' ? 1200 : 2200,
    fromOffsets: [...run.system.orbitOffsets],
    toOffsets: nextOrbitOffsets(run.system, false),
  }
  return next
}

function finalizeTravelAnimation(run) {
  if (!run?.ui?.travelAnimation) return run
  const anim = run.ui.travelAnimation
  let next = deepClone(run)
  next.ui.travelAnimation = null
  if (anim.mode === 'meteor') {
    const meteorFuel = fuelCostForDistance(next, nodeDistance(next.system, findNode(next.system, anim.fromNodeId), findNode(next.system, anim.toNodeId)), 'meteor')
    next = performMove(next, anim.toNodeId, 0.35, `Hitched a ride on the meteor stream. Fuel -${meteorFuel}.`, 'meteor')
  } else if (anim.mode === 'wait') {
    next = performMove(next, anim.toNodeId, 1, 'Waited one turn.', 'wait')
  } else {
    next = performMove(next, anim.toNodeId, 1, null, 'travel')
  }
  return next
}

function newRun(setupCandidate = defaultSetupPrefs()) {
  const seed = `run_${Date.now()}`
  const rng = makeRng(seed)
  const setup = sanitizeSetupPrefs(setupCandidate)
  const shipClass = setup.shipClass
  const preset = SHIP_PRESETS[shipClass]
  const arrivalIndex = rng.int(0, 3)
  const system = buildSystem(seed, 1, arrivalIndex)
  const currentNodeId = system.nodes.find((node) => node.kind === 'base_arrival')?.id || system.nodes[0].id
  const cargo = (STARTING_CARGO[shipClass] || []).map((itemId) => buildCargoItem(itemId))
  let crew = [buildCrew(rng), buildCrew(rng), buildCrew(rng)]
  const startingSkills = [
    ['pilot', 'dodge'],
    ['repair_specialist', 'repair_speed'],
    ['weapon_specialist', 'rate_of_fire'],
  ]
  crew = crew.map((member, index) => {
    const [skillId, perkId] = startingSkills[index] || []
    return skillId ? applyCrewSkillChoice({ ...member, skills: {} }, skillId, perkId) : member
  })
  const ui = defaultUiState()
  ui.selectedCargoItemId = cargo[0]?.id || null
  ui.selectedCrewId = crew[0]?.id || null
  return {
    seed,
    screen: 'map',
    systemIndex: 1,
    turn: 0,
    shipName: setup.shipName,
    playerName: setup.playerName,
    playerWanted: false,
    playerWantedReason: null,
    player: {
      shipClass,
      hullMax: preset.hullMax,
      hull: preset.hullMax,
      shieldsMax: preset.shieldsMax,
      shields: preset.shieldsMax,
      armourMax: preset.armour,
      armour: preset.armour,
      speed: preset.speed,
      maneuverability: preset.maneuverability,
      stealth: preset.stealth,
      cargoCapacity: preset.cargoCapacity,
      fuelCapacity: preset.fuelCapacity,
      crewCapacity: preset.crewCapacity,
      weaponSlotsMax: preset.weaponSlots,
      maxPower: preset.maxPower,
      value: preset.value,
      autoRepair: true,
      autoReload: true,
      weaponSlots: buildWeaponSlotLayout(preset.loadout, preset.weaponSlots),
    },
    crew,
    cargo: [...cargo, buildMissileCargo(1, MISSILE_CARGO_STACK), buildMissileCargo(2, 2)],
    resources: { fuel: preset.fuelCapacity - 4, reserveFuel: 0, scrap: 20, parts: 8, credits: 120, kinetic_ammo: 18 },
    system,
    currentNodeId,
    selectedNodeId: currentNodeId,
    log: [formatLogEntry(0, `${setup.playerName} brought ${setup.shipName} online.`)],
    ui,
    combat: null,
    combatWarning: null,
    pendingEvent: null,
    pendingAdvancements: [],
  }
}

function MiniStat({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-900 border-slate-800 text-slate-100',
    cyan: 'bg-cyan-950/40 border-cyan-800 text-cyan-100',
    green: 'bg-emerald-950/40 border-emerald-800 text-emerald-100',
    rose: 'bg-rose-950/40 border-rose-800 text-rose-100',
    amber: 'bg-amber-950/40 border-amber-800 text-amber-100',
  }
  return <div className={`rounded-2xl border px-3 py-2 ${tones[tone]}`}><div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>
}

function ActionButton({ children, onClick, disabled = false, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-800 text-slate-100',
    green: 'bg-emerald-500 text-slate-950',
    amber: 'bg-amber-500 text-slate-950',
    rose: 'bg-rose-500 text-white',
    cyan: 'bg-cyan-500 text-slate-950',
  }
  return <button className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${disabled ? 'bg-slate-900 text-slate-500' : tones[tone]}`} onClick={onClick} disabled={disabled}>{children}</button>
}

function MiniActionButton({ children, onClick, disabled = false, active = false }) {
  return (
    <button
      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${disabled ? 'bg-slate-900 text-slate-500' : active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function TerminalTab({ active, onClick, children }) {
  return <button className={`flex-1 rounded-xl px-1 py-2 text-[11px] font-semibold sm:px-2 sm:text-xs ${active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={onClick}>{children}</button>
}

function NodeGlyph({ kind, size = 28 }) {
  const meta = KIND_META[kind] || KIND_META.planet
  return <span style={{ color: meta.colour, fontSize: size, lineHeight: 1 }}>{meta.symbol}</span>
}

function ShipGraphic({ compact = false }) {
  return (
    <svg viewBox="0 0 220 120" className={compact ? 'w-36 h-20' : 'w-full h-36'}>
      <defs><linearGradient id="shipGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#64748b" /></linearGradient></defs>
      <g transform="translate(110 60)">
        <path d="M 0 -42 L 20 -8 L 20 18 L 0 50 L -20 18 L -20 -8 Z" fill="url(#shipGrad)" stroke="#0f172a" strokeWidth="2" />
        <rect x="-11" y="-12" width="22" height="40" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
        <path d="M -42 8 L -20 0 L -20 18 L -34 22 Z" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
        <path d="M 42 8 L 20 0 L 20 18 L 34 22 Z" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
        <circle cx="0" cy="-2" r="6" fill="#22d3ee" opacity="0.9" />
        <path d="M -8 50 L 0 68 L 8 50" fill="#f59e0b" opacity="0.85" />
      </g>
    </svg>
  )
}

function LocalElementGraphic({ node }) {
  const meta = KIND_META[node.kind] || KIND_META.planet
  return <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 w-full"><div className="flex items-center justify-center h-32"><div className="flex flex-col items-center gap-3"><NodeGlyph kind={node.kind} size={44} /><div className="text-center"><div className="text-base font-semibold">{node.label}</div><div className="text-xs text-slate-400">{meta.label}</div></div></div></div></div>
}

function LayerPips({ label, total, filled, activeColour }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
        <span>{label}</span>
        <span className="text-slate-500">{filled}/{Math.max(0, total)}</span>
      </div>
      <div className="mt-1 flex min-h-4 flex-wrap gap-1">
        {Array.from({ length: Math.max(0, total) }, (_, index) => (
          <span
            key={`${label}_${index}`}
            className="h-2.5 w-2.5 rounded-full border border-slate-500/80"
            style={{ backgroundColor: index < filled ? activeColour : 'transparent' }}
          />
        ))}
      </div>
    </div>
  )
}

function FuelCells({ fuel, fuelCapacity }) {
  const total = Math.max(6, Math.min(12, fuelCapacity || 6))
  const filled = fuelCapacity > 0 ? clamp(Math.round((fuel / fuelCapacity) * total), 0, total) : 0
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
        <span>Fuel</span>
        <span className="text-amber-200">{fuel}/{fuelCapacity}</span>
      </div>
      <div className="mt-1 flex min-h-4 flex-wrap gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={`fuel_${index}`}
            className="h-2.5 flex-1 rounded-sm border border-amber-400/40"
            style={{ minWidth: '12px', backgroundColor: index < filled ? '#f59e0b' : 'transparent' }}
          />
        ))}
      </div>
    </div>
  )
}

function ShipStatusStrip({ player, fuel, fuelCapacity, shipName, playerName, resources }) {
  const hullRatio = player.hullMax ? player.hull / player.hullMax : 0
  const hullColour = hullRatio > 0.6 ? '#22c55e' : hullRatio >= 0.2 ? '#f59e0b' : '#ef4444'
  const shieldTotal = shieldLayerCount(player)
  const shieldFilled = chargedShieldLayers(player)
  const armourTotal = Math.max(0, player.armourMax || player.armour || 0)
  const armourFilled = clamp(player.armour || 0, 0, armourTotal)

  return (
    <div className="px-3 pt-3">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <div>Resources</div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-emerald-200">Scrap {resources.scrap}</span>
            <span className="text-cyan-200">Parts {resources.parts}</span>
            <span className="text-amber-200">Credits {resources.credits}</span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Ship integrity</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">{shipName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">{playerName} · {player.shipClass}</div>
          </div>
          <div className="text-right text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <div>Crew {player.crewCapacity} max</div>
            <div>Power {player.maxPower}</div>
          </div>
        </div>
        <div className="mt-2 relative h-6 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
          <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(0, Math.min(100, hullRatio * 100))}%`, backgroundColor: hullColour }} />
          <div className="absolute inset-0 flex items-center pl-3 text-xs font-bold text-slate-950">{player.hull}/{player.hullMax}</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <LayerPips label="Shields" total={shieldTotal} filled={shieldFilled} activeColour="#3b82f6" />
          <LayerPips label="Armour" total={armourTotal} filled={armourFilled} activeColour="#f8fafc" />
          <FuelCells fuel={fuel} fuelCapacity={fuelCapacity} />
        </div>
      </div>
    </div>
  )
}

function EntityStatusPanel({ title, entity, accent = 'cyan', stats = [], systems = null, toggles = [] }) {
  const hullRatio = entity.hullMax ? entity.hull / entity.hullMax : 0
  const hullColour = hullRatio > 0.6 ? '#22c55e' : hullRatio >= 0.2 ? '#f59e0b' : '#ef4444'
  const shieldTotal = Math.max(0, shieldLayerCount(entity) - Math.max(0, Number(systems?.shieldLayersDisabled) || 0))
  const shieldCapacity = combatShieldCapacity(entity, systems)
  const shieldFilled = shieldTotal > 0 ? clamp(Math.ceil((effectiveCombatShields(entity, systems) / Math.max(1, shieldCapacity || 1)) * shieldTotal), 0, shieldTotal) : 0
  const armourTotal = Math.max(0, entity.armourMax || entity.armour || 0)
  const armourFilled = clamp(entity.armour || 0, 0, armourTotal)
  const accentClass = accent === 'rose' ? 'border-rose-800 bg-rose-950/15' : 'border-cyan-800 bg-cyan-950/15'

  return (
    <div className={`rounded-3xl border p-3 ${accentClass}`}>
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">
        <span>{title}</span>
        <span className="text-slate-500">{entity.hull}/{entity.hullMax} hull</span>
      </div>
      <div className="mt-2 relative h-6 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
        <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(0, Math.min(100, hullRatio * 100))}%`, backgroundColor: hullColour }} />
        <div className="absolute inset-0 flex items-center pl-3 text-xs font-bold text-slate-950">{entity.hull}/{entity.hullMax}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <LayerPips label="Shields" total={shieldTotal} filled={shieldFilled} activeColour="#3b82f6" />
        <LayerPips label="Armour" total={armourTotal} filled={armourFilled} activeColour="#f8fafc" />
      </div>
      {stats.length > 0 ? <div className="mt-3 grid grid-cols-2 gap-2">{stats.map((stat) => <MiniStat key={stat.label} label={stat.label} value={stat.value} tone={stat.tone || 'slate'} />)}</div> : null}
      {toggles.length > 0 ? <div className="mt-3 grid grid-cols-2 gap-2">{toggles.map((toggle) => <button key={toggle.label} type="button" className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${toggle.active ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-200'}`} onClick={toggle.onClick}>{toggle.label}: {toggle.active ? 'ON' : 'OFF'}</button>)}</div> : null}
    </div>
  )
}

function ShipSystemsPanel({
  title,
  accent = 'cyan',
  entity,
  systems,
  weapons = [],
  crew = [],
  selectedTarget = null,
  onSelectTarget = null,
  run,
  isPlayerSide = false,
  weaponAssignments = {},
  incomingMarkers = {},
  combatNow = Date.now(),
  onTogglePower = null,
  onToggleReload = null,
  onArmWeaponTarget = null,
  targetingWeaponIndex = null,
  onToggleRepair = null,
  repairQueue = [],
}) {
  const accentClass = accent === 'rose' ? 'border-rose-800 bg-rose-950/15' : 'border-cyan-800 bg-cyan-950/15'
  const buttonIdle = accent === 'rose' ? 'bg-slate-900 text-slate-100 border-rose-900/60' : 'bg-slate-900 text-slate-100 border-cyan-900/60'
  const buttonActive = accent === 'rose' ? 'bg-rose-500 text-slate-950 border-rose-400' : 'bg-cyan-500 text-slate-950 border-cyan-400'
  const aliveCrew = crew.filter((member) => (member.health ?? member.healthMax ?? 1) > 0).length
  const rows = [
    { id: 'hull', label: 'Hull', value: `${entity.hull}/${entity.hullMax}` },
    { id: 'shields', label: 'Shields', value: `${effectiveCombatShields(entity, systems)}/${combatShieldCapacity(entity, systems)}` },
    { id: 'engines', label: 'Engines', value: `Dodge -${combatEnginePenalty(systems)}` },
    { id: 'crew', label: 'Crew quarters', value: `${aliveCrew}/${crew.length || 0} active` },
  ]
  const markerText = (targetId) => {
    const playerMarkers = weaponAssignments[targetId] || []
    const hostileMarkers = incomingMarkers[targetId] || []
    return [...(playerMarkers.length > 0 ? [`◎ ${playerMarkers.join(', ')}`] : []), ...(hostileMarkers.length > 0 ? [`◉ ${hostileMarkers.join(', ')}`] : [])].join(' · ')
  }

  return (
    <div className={`rounded-3xl border p-4 ${accentClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</div>
        {selectedTarget && onSelectTarget ? <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Targeting {combatTargetLabel(selectedTarget, weapons)}</div> : null}
      </div>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`rounded-2xl border px-3 py-3 text-left ${onSelectTarget ? (selectedTarget === row.id ? buttonActive : buttonIdle) : 'border-slate-800 bg-slate-950/50 text-slate-100'}`}
            onClick={onSelectTarget ? () => onSelectTarget(row.id) : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{row.label}</div>
              <div className="text-right">
                <div className="text-xs text-slate-300">{row.value}</div>
                {markerText(row.id) ? <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">{markerText(row.id)}</div> : null}
              </div>
            </div>
          </button>
        ))}
        {weapons.filter(Boolean).map((weapon) => {
          const targetId = `weapon:${weapon.instanceId}`
          const weaponIndex = weapons.findIndex((entry) => entry?.instanceId === weapon.instanceId)
          return (
            <div
              key={weapon.instanceId}
              className={`rounded-2xl border px-3 py-3 text-left ${onSelectTarget ? (selectedTarget === targetId ? buttonActive : buttonIdle) : 'border-slate-800 bg-slate-950/50 text-slate-100'}`}
              onClick={onSelectTarget ? () => onSelectTarget(targetId) : undefined}
              role={onSelectTarget ? 'button' : undefined}
              tabIndex={onSelectTarget ? 0 : undefined}
              onKeyDown={onSelectTarget ? (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onSelectTarget(targetId)
              } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">#{weaponIndex + 1} {weapon.name}</div>
                  <div className="text-[11px] text-slate-400">Weapon system · ammo {weaponAmmoCount(run, weapon, isPlayerSide)} {weapon.ammoType ? ammoUnitsLabel(weapon.ammoType) : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-300">{Math.round(weapon.hp || 0)}/{weapon.maxHp}</div>
                  {markerText(targetId) ? <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">{markerText(targetId)}</div> : null}
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-emerald-900/70 bg-slate-950">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${weaponHpRatio(weapon) * 100}%` }} />
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
                <div className={`h-full rounded-full transition-[width] duration-100 ${accent === 'rose' ? 'bg-rose-400' : 'bg-cyan-400'}`} style={{ width: `${weaponChargeRatio(weapon, combatNow) * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                <span>Lvl {equipmentLevel(weapon.level)}</span>
                <span>{Math.round(weaponChargeRatio(weapon, combatNow) * 100)}% charged</span>
                {weapon.ammoType ? <span>{weaponAmmoCount(run, weapon, isPlayerSide)} {ammoUnitsLabel(weapon.ammoType)}</span> : null}
                {isPlayerSide ? <span>{weapon.targetId ? `Target ${combatTargetLabel(weapon.targetId, run?.combat?.enemy?.weapons || [])}` : 'Target Hull'}</span> : null}
              </div>
              {isPlayerSide ? (
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <button type="button" className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${weapon.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={(event) => { event.stopPropagation(); onTogglePower?.(weaponIndex) }}>Power</button>
                  {weapon.ammoType === 'missile' ? <button type="button" className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${weapon.autoReload ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={(event) => { event.stopPropagation(); onToggleReload?.(weaponIndex) }}>Reload</button> : <div className="rounded-xl border border-slate-800 px-3 py-2 text-[11px] text-slate-500">No reload</div>}
                  <button type="button" className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${targetingWeaponIndex === weaponIndex ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={(event) => { event.stopPropagation(); onArmWeaponTarget?.(weaponIndex) }}>Target</button>
                  {((weapon.hp || 0) < (weapon.maxHp || 1)) ? <button type="button" className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${(repairQueue || []).includes(weapon.instanceId) ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`} onClick={(event) => { event.stopPropagation(); onToggleRepair?.(weapon.instanceId) }}>{(repairQueue || []).includes(weapon.instanceId) ? 'Repairing' : 'Repair'}</button> : <div className="rounded-xl border border-slate-800 px-3 py-2 text-[11px] text-slate-500">Stable</div>}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CombatShipSilhouette({ x, y, mirrored = false, accent = '#38bdf8', shieldRatio = 0, now = 0, scale = 1 }) {
  const flameOpacity = 0.5 + ((Math.sin(now / 140) + 1) / 2) * 0.35
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`${mirrored ? 'scale(-1 1)' : 'scale(1 1)'} scale(${scale})`}>
        <circle r="46" fill="none" stroke={accent} strokeWidth="7" opacity={0.14 + shieldRatio * 0.5} />
        <circle r="31" fill="none" stroke={accent} strokeWidth="2.5" opacity={0.18 + shieldRatio * 0.35} />
        <path d="M -36 8 L -14 -4 L -14 18 L -30 22 Z" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
        <path d="M 36 8 L 14 -4 L 14 18 L 30 22 Z" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
        <path d="M 0 -42 L 18 -8 L 18 20 L 0 46 L -18 20 L -18 -8 Z" fill="#dbe4ef" stroke="#0f172a" strokeWidth="2.4" />
        <rect x="-10" y="-13" width="20" height="34" rx="6" fill="#0f172a" stroke={accent} strokeWidth="1.8" />
        <circle cx="0" cy="-1" r="5.5" fill={accent} opacity="0.92" />
        <path d="M -8 46 L 0 64 L 8 46" fill="#f59e0b" opacity={flameOpacity} />
      </g>
    </g>
  )
}

function CombatScene({ player, enemy, shots = [], now, playerLabel }) {
  const playerShieldRatio = player.shieldsMax ? player.shields / player.shieldsMax : 0
  const enemyShieldRatio = enemy.shieldsMax ? enemy.shields / enemy.shieldsMax : 0
  const enemyAccent = enemy.kind === 'patrol' ? '#fb7185' : '#ef4444'
  const activeShots = shots.filter((shot) => now - shot.startedAt <= (shot.durationMs || 800))

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-3">
      <svg viewBox="0 0 520 240" className="w-full rounded-2xl bg-[#040712]">
        <defs>
          <linearGradient id="combatLane" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor={enemyAccent} stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="520" height="240" fill="#020617" />
        {[28, 74, 126, 188, 242, 320, 366, 428, 476].map((cx, index) => (
          <circle key={`star_${cx}`} cx={cx} cy={28 + (index % 4) * 47} r={index % 3 === 0 ? 1.8 : 1.1} fill="#cbd5e1" opacity={0.4 + (index % 4) * 0.08} />
        ))}
        <ellipse cx="260" cy="122" rx="188" ry="46" fill="none" stroke="url(#combatLane)" strokeWidth="1.5" strokeDasharray="8 9" opacity="0.24" />
        <line x1="148" y1="122" x2="372" y2="122" stroke="url(#combatLane)" strokeWidth="3" strokeDasharray="10 12" opacity="0.28" />

        {activeShots.map((shot) => {
          const progress = clamp((now - shot.startedAt) / shot.durationMs, 0, 1)
          const direction = shot.from === 'player' ? 1 : -1
          const startX = shot.from === 'player' ? 156 : 364
          const hitX = shot.from === 'player' ? 382 : 138
          const missX = shot.from === 'player' ? 500 : 20
          const startY = 102 + shot.laneIndex * 16
          const endY = shot.hit ? startY : startY + (shot.from === 'player' ? -42 + shot.laneIndex * 4 : 42 - shot.laneIndex * 4)
          const endX = shot.hit ? hitX : missX
          const x = startX + ((endX - startX) * progress)
          const y = startY + ((endY - startY) * progress)
          const opacity = 1 - progress * 0.35

          if (shot.kind === 'laser' || shot.kind === 'mining') {
            return (
              <g key={shot.id} opacity={opacity}>
                <line x1={startX} y1={startY} x2={x} y2={y} stroke={shot.colour} strokeWidth={shot.kind === 'mining' ? 3 : 2.2} strokeDasharray={shot.kind === 'mining' ? '6 4' : undefined} />
                {shot.hit && progress > 0.86 ? <circle cx={endX} cy={endY} r="6" fill={shot.colour} opacity="0.55" /> : null}
              </g>
            )
          }

          if (shot.kind === 'missile') {
            const points = direction === 1 ? `${x},${y} ${x - 12},${y - 5} ${x - 12},${y + 5}` : `${x},${y} ${x + 12},${y - 5} ${x + 12},${y + 5}`
            return (
              <g key={shot.id} opacity={opacity}>
                <line x1={startX} y1={startY} x2={x - direction * 10} y2={y} stroke={shot.colour} strokeWidth="2.4" opacity="0.55" />
                <polygon points={points} fill={shot.colour} />
                {shot.hit && progress > 0.88 ? <circle cx={endX} cy={endY} r="9" fill={shot.colour} opacity="0.35" /> : null}
              </g>
            )
          }

          return (
            <g key={shot.id} opacity={opacity}>
              <line x1={x - direction * 8} y1={y} x2={x} y2={y} stroke={shot.colour} strokeWidth="2.2" />
              <circle cx={x} cy={y} r="3.2" fill={shot.colour} />
              {shot.hit && progress > 0.9 ? <circle cx={endX} cy={endY} r="5" fill={shot.colour} opacity="0.45" /> : null}
            </g>
          )
        })}

        <CombatShipSilhouette x={104} y={124} accent="#38bdf8" shieldRatio={playerShieldRatio} now={now} />
        <CombatShipSilhouette x={416} y={124} accent={enemyAccent} shieldRatio={enemyShieldRatio} now={now + 120} mirrored />

        <g transform="translate(34 32)">
          <text x="0" y="0" fill="#e2e8f0" fontSize="18" fontWeight="700">{playerLabel}</text>
        </g>

        <g transform="translate(366 32)">
          <text x="120" y="0" textAnchor="end" fill="#e2e8f0" fontSize="18" fontWeight="700">{enemy.name}</text>
        </g>
      </svg>
    </div>
  )
}

function hexArenaCenter(col, row, size) {
  return {
    x: Math.sqrt(3) * size * (col + 0.5 * (row & 1)),
    y: size * 1.5 * row,
  }
}

function hexArenaPolygon(center, size) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index) - 30) * (Math.PI / 180)
    return `${center.x + size * Math.cos(angle)},${center.y + size * Math.sin(angle)}`
  }).join(' ')
}

function TacticalBullseye({ x, y, colour = '#ef4444' }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r="15" fill="none" stroke={colour} strokeWidth="2.6" />
      <circle cx={x} cy={y} r="6.5" fill="none" stroke={colour} strokeWidth="2.2" />
      <line x1={x - 21} y1={y} x2={x - 10} y2={y} stroke={colour} strokeWidth="2.1" />
      <line x1={x + 10} y1={y} x2={x + 21} y2={y} stroke={colour} strokeWidth="2.1" />
      <line x1={x} y1={y - 21} x2={x} y2={y - 10} stroke={colour} strokeWidth="2.1" />
      <line x1={x} y1={y + 10} x2={x} y2={y + 21} stroke={colour} strokeWidth="2.1" />
    </g>
  )
}

function HexCombatArena({
  run,
  onHexClick,
  onSelectUnit,
  onTargetUnit,
  onAttackUnit,
  onHoverUnit,
  hoveredUnitId,
  now,
}) {
  const combat = run.combat
  const size = HEX_ARENA.size
  const boardOffset = { x: 142, y: 54 }
  const boardWidth = Math.sqrt(3) * size * (HEX_ARENA.cols + 0.5)
  const boardHeight = size * 1.5 * Math.max(0, HEX_ARENA.rows - 1) + size * 2
  const viewWidth = boardOffset.x * 2 + boardWidth
  const viewHeight = boardOffset.y * 2 + boardHeight
  const selectedEntry = combat.selectedUnitId ? findCombatUnit(run, combat.selectedUnitId) : null
  const hoveredEntry = hoveredUnitId ? findCombatUnit(run, hoveredUnitId) : null
  const playerShipFootprint = hexCombatShipFootprint(combat.playerShipUnit)
  const enemyShipFootprint = hexCombatShipFootprint(combat.enemyShipUnit)
  const selectedHex = selectedEntry
    ? (selectedEntry.kind === 'squadron' ? selectedEntry.unit.position : hexCombatShipCenter(selectedEntry.unit))
    : null
  const toPixel = (hex) => {
    const center = hexArenaCenter(hex.col, hex.row, size)
    return { x: center.x + boardOffset.x, y: center.y + boardOffset.y }
  }
  const shipAnchor = (unit) => {
    const points = hexCombatShipFootprint(unit).map((hex) => toPixel(hex))
    const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 })
    return { x: sum.x / Math.max(1, points.length), y: sum.y / Math.max(1, points.length) }
  }
  const playerShip = shipAnchor(combat.playerShipUnit)
  const enemyShip = shipAnchor(combat.enemyShipUnit)
  const playerLabel = run.shipName
  const playerShieldRatio = run.player.shieldsMax ? run.player.shields / run.player.shieldsMax : 0
  const reachable = new Set(hexCombatReachableHexes(run, combat.selectedUnitId).map((hex) => `${hex.col}:${hex.row}`))
  const hoverAttackPreview = hoveredEntry?.side === 'enemy' && selectedEntry?.side === 'player' ? hexCombatAttackPreview(run, combat.selectedUnitId, hoveredUnitId) : null
  const bullseyeHex = hoveredEntry?.side === 'enemy' && selectedEntry?.side === 'player'
    ? (hoveredEntry.kind === 'ship' ? hexCombatShipCenter(hoveredEntry.unit) : hoveredEntry.unit.position)
    : null
  const activeEffects = (combat.effects || []).filter((effect) => now - (effect.startedAt || 0) <= (effect.durationMs || 800))
  const activeFloaters = (combat.floaters || []).filter((entry) => now - (entry.startedAt || 0) <= (entry.durationMs || 1100))
  const focusMarkers = hexWeaponFocusMarkers(run)
  const effectEndpoints = (effect) => {
    const fromEntry = findCombatUnit(run, effect.fromUnitId)
    const toEntry = findCombatUnit(run, effect.toUnitId)
    if (!fromEntry || !toEntry) return null
    const fromPoint = fromEntry.kind === 'ship' ? shipAnchor(fromEntry.unit) : toPixel(fromEntry.unit.position)
    const toPoint = toEntry.kind === 'ship' ? shipAnchor(toEntry.unit) : toPixel(toEntry.unit.position)
    return { from: fromPoint, to: toPoint }
  }
  const unitAnchor = (entry) => (entry?.kind === 'ship' ? shipAnchor(entry.unit) : toPixel(entry.unit.position))
  const handleUnitClick = (unitId) => {
    const entry = findCombatUnit(run, unitId)
    if (!entry) return
    const activeSelection = findCombatUnit(run, combat.selectedUnitId)
    if (entry.side === 'enemy' && activeSelection?.side === 'player') {
      const preview = hexCombatAttackPreview(run, activeSelection.unit.id, unitId)
      if (preview.canAttack) onAttackUnit?.(unitId)
      else onTargetUnit?.(unitId)
      return
    }
    onSelectUnit?.(unitId)
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-3">
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full rounded-2xl bg-[#020617]" onMouseLeave={() => onHoverUnit?.(null)}>
        <defs>
          <linearGradient id="hexLane" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.65" />
          </linearGradient>
          <clipPath id="playerShipClip">
            {playerShipFootprint.map((hex) => <polygon key={`player_clip_${hex.col}_${hex.row}`} points={hexArenaPolygon(toPixel(hex), size - 4)} />)}
          </clipPath>
          <clipPath id="enemyShipClip">
            {enemyShipFootprint.map((hex) => <polygon key={`enemy_clip_${hex.col}_${hex.row}`} points={hexArenaPolygon(toPixel(hex), size - 4)} />)}
          </clipPath>
        </defs>
        <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="#020617" />
        {Array.from({ length: 22 }, (_, index) => (
          <circle
            key={`hex_star_${index}`}
            cx={24 + ((index * 53) % Math.max(80, Math.round(viewWidth - 48)))}
            cy={18 + ((index * 37) % Math.max(60, Math.round(viewHeight - 36)))}
            r={index % 3 === 0 ? 1.5 : 1}
            fill="#cbd5e1"
            opacity={0.2 + (index % 5) * 0.08}
          />
        ))}
        <line x1={playerShip.x + 30} y1={playerShip.y} x2={enemyShip.x - 30} y2={enemyShip.y} stroke="url(#hexLane)" strokeWidth="2" strokeDasharray="10 8" opacity="0.32" />

        {Array.from({ length: HEX_ARENA.rows }, (_, row) => (
          Array.from({ length: HEX_ARENA.cols }, (_, col) => {
            const center = hexArenaCenter(col, row, size)
            const absoluteCenter = { x: center.x + boardOffset.x, y: center.y + boardOffset.y }
            const hexKey = `${col}:${row}`
            const isSelected = selectedHex && selectedHex.col === col && selectedHex.row === row
            const isReachable = reachable.has(hexKey)
            return (
              <g key={hexKey}>
                <polygon
                  points={hexArenaPolygon(absoluteCenter, size - 1.2)}
                  fill={isSelected ? 'rgba(251,191,36,0.28)' : isReachable ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.88)'}
                  stroke={isSelected ? '#fbbf24' : isReachable ? '#4ade80' : '#334155'}
                  strokeWidth="1.3"
                />
                {isReachable ? (
                  <polygon
                    points={hexArenaPolygon(absoluteCenter, size + 1.5)}
                    fill="rgba(0,0,0,0)"
                    stroke="transparent"
                    strokeWidth="8"
                    className="cursor-pointer"
                    onClick={() => onHexClick?.({ col, row })}
                  />
                ) : null}
                <text x={absoluteCenter.x} y={absoluteCenter.y + 4} textAnchor="middle" fill="#475569" fontSize="9" pointerEvents="none">{col + 1}-{row + 1}</text>
              </g>
            )
          })
        ))}

        {playerShipFootprint.map((hex) => {
          const center = toPixel(hex)
          const selected = combat.selectedUnitId === combat.playerShipUnit?.id
          const hovered = hoveredUnitId === combat.playerShipUnit?.id
          return (
            <polygon
              key={`player_ship_hex_${hex.col}_${hex.row}`}
              points={hexArenaPolygon(center, hovered ? size - 2.5 : size - 4)}
              fill="rgba(56,189,248,0.24)"
              stroke={hovered ? '#67e8f9' : selected ? '#22d3ee' : '#0891b2'}
              strokeWidth={hovered || selected ? '3.6' : '1.8'}
              onClick={() => handleUnitClick(combat.playerShipUnit.id)}
              onMouseEnter={() => onHoverUnit?.(combat.playerShipUnit.id)}
              onMouseLeave={() => onHoverUnit?.(null)}
              className="cursor-pointer"
            />
          )
        })}
        {enemyShipFootprint.map((hex) => {
          const center = toPixel(hex)
          const selected = combat.selectedUnitId === combat.enemyShipUnit?.id
          const targeted = combat.selectedTargetUnitId === combat.enemyShipUnit?.id
          const hovered = hoveredUnitId === combat.enemyShipUnit?.id
          return (
            <polygon
              key={`enemy_ship_hex_${hex.col}_${hex.row}`}
              points={hexArenaPolygon(center, hovered ? size - 2.5 : size - 4)}
              fill="rgba(239,68,68,0.22)"
              stroke={hovered ? '#fecaca' : selected ? '#fca5a5' : targeted ? '#fbbf24' : '#ef4444'}
              strokeWidth={hovered || selected || targeted ? '3.6' : '1.8'}
              strokeDasharray={targeted ? '6 4' : undefined}
              onClick={() => handleUnitClick(combat.enemyShipUnit.id)}
              onMouseEnter={() => onHoverUnit?.(combat.enemyShipUnit.id)}
              onMouseLeave={() => onHoverUnit?.(null)}
              className="cursor-pointer"
            />
          )
        })}

        <g clipPath="url(#playerShipClip)">
          <CombatShipSilhouette x={playerShip.x} y={playerShip.y} accent="#38bdf8" shieldRatio={playerShieldRatio} now={now} scale={0.72} />
        </g>
        <g clipPath="url(#enemyShipClip)">
          <CombatShipSilhouette x={enemyShip.x} y={enemyShip.y} accent={combat.enemy.kind === 'patrol' ? '#fb7185' : '#ef4444'} shieldRatio={combat.enemy.shieldsMax ? combat.enemy.shields / combat.enemy.shieldsMax : 0} now={now + 180} mirrored scale={0.72} />
        </g>

        {(combat.squadrons || []).filter((entry) => squadronAliveCount(entry) > 0).map((squadron) => {
          const absoluteCenter = toPixel(squadron.position)
          const alive = aliveSquadronDrones(squadron)
          const ring = 11
          const dots = alive.map((_, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(alive.length, 1)
            return {
              x: absoluteCenter.x + Math.cos(angle) * ring,
              y: absoluteCenter.y + Math.sin(angle) * ring,
            }
          })
          const selected = combat.selectedUnitId === squadron.id
          const targeted = combat.selectedTargetUnitId === squadron.id
          const hovered = hoveredUnitId === squadron.id
          return (
            <g
              key={squadron.id}
              onClick={() => handleUnitClick(squadron.id)}
              onMouseEnter={() => onHoverUnit?.(squadron.id)}
              onMouseLeave={() => onHoverUnit?.(null)}
              className="cursor-pointer"
            >
              {selected || hovered ? <polygon points={hexArenaPolygon(absoluteCenter, hovered ? size + 4.5 : size + 3)} fill="none" stroke={squadron.side === 'player' ? (hovered ? '#67e8f9' : '#22d3ee') : (hovered ? '#fecaca' : '#fca5a5')} strokeWidth="3.4" /> : null}
              {targeted ? <polygon points={hexArenaPolygon(absoluteCenter, size + 1)} fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeDasharray="5 4" /> : null}
              <circle cx={absoluteCenter.x} cy={absoluteCenter.y} r={hovered ? '20' : '18'} fill="#0f172a" stroke="#22c55e" strokeWidth="2.2" />
              {dots.map((dot, index) => <circle key={`drone_dot_${index}`} cx={dot.x} cy={dot.y} r="3.2" fill="#bbf7d0" stroke="#14532d" strokeWidth="1" />)}
              <circle cx={absoluteCenter.x} cy={absoluteCenter.y} r="6.5" fill="#16a34a" />
              <text x={absoluteCenter.x} y={absoluteCenter.y + 3.5} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="700">{alive.length}</text>
            </g>
          )
        })}

        {Object.entries(focusMarkers).map(([unitId, marker]) => {
          const entry = findCombatUnit(run, unitId)
          if (!entry) return null
          const anchor = unitAnchor(entry)
          const playerText = marker.player.length > 0 ? `P${marker.player.join(',')}` : ''
          const enemyText = marker.enemy.length > 0 ? `E${marker.enemy.join(',')}` : ''
          return (
            <g key={`focus_${unitId}`} pointerEvents="none">
              {playerText ? (
                <g transform={`translate(${anchor.x - 18} ${anchor.y - 26})`}>
                  <circle cx="0" cy="0" r="12" fill="#fbbf24" opacity="0.92" />
                  <text x="0" y="4" textAnchor="middle" fill="#111827" fontSize="8" fontWeight="700">{playerText}</text>
                </g>
              ) : null}
              {enemyText ? (
                <g transform={`translate(${anchor.x + 18} ${anchor.y - 26})`}>
                  <circle cx="0" cy="0" r="12" fill="#fb7185" opacity="0.92" />
                  <text x="0" y="4" textAnchor="middle" fill="#111827" fontSize="8" fontWeight="700">{enemyText}</text>
                </g>
              ) : null}
            </g>
          )
        })}

        {activeEffects.map((effect) => {
          const endpoints = effectEndpoints(effect)
          if (!endpoints) return null
          const progress = clamp((now - effect.startedAt) / Math.max(1, effect.durationMs || 820), 0, 1)
          const x = endpoints.from.x + ((endpoints.to.x - endpoints.from.x) * progress)
          const y = endpoints.from.y + ((endpoints.to.y - endpoints.from.y) * progress)
          if (effect.kind === 'missile') {
            const direction = endpoints.to.x >= endpoints.from.x ? 1 : -1
            const points = direction === 1 ? `${x},${y} ${x - 12},${y - 5} ${x - 12},${y + 5}` : `${x},${y} ${x + 12},${y - 5} ${x + 12},${y + 5}`
            return (
              <g key={effect.id} opacity={1 - progress * 0.2} pointerEvents="none">
                <line x1={endpoints.from.x} y1={endpoints.from.y} x2={x - direction * 10} y2={y} stroke={effect.colour} strokeWidth="2.4" opacity="0.55" />
                <polygon points={points} fill={effect.colour} />
                {progress > 0.88 ? <circle cx={endpoints.to.x} cy={endpoints.to.y} r="9" fill={effect.colour} opacity="0.35" /> : null}
              </g>
            )
          }
          if (effect.kind === 'kinetic') {
            return (
              <g key={effect.id} opacity={1 - progress * 0.24} pointerEvents="none">
                <line x1={x - 8} y1={y} x2={x} y2={y} stroke={effect.colour} strokeWidth="2.2" />
                <circle cx={x} cy={y} r="3.2" fill={effect.colour} />
                {progress > 0.92 ? <circle cx={endpoints.to.x} cy={endpoints.to.y} r="5" fill={effect.colour} opacity="0.45" /> : null}
              </g>
            )
          }
          return (
            <g key={effect.id} opacity={1 - progress * 0.18} pointerEvents="none">
              <line x1={endpoints.from.x} y1={endpoints.from.y} x2={x} y2={y} stroke={effect.colour} strokeWidth={effect.kind === 'mining' ? 3 : 2.2} strokeDasharray={effect.kind === 'mining' ? '6 4' : undefined} />
              {progress > 0.86 ? <circle cx={endpoints.to.x} cy={endpoints.to.y} r="6" fill={effect.colour} opacity="0.45" /> : null}
            </g>
          )
        })}

        {activeFloaters.map((floater) => {
          const entry = findCombatUnit(run, floater.targetId)
          if (!entry) return null
          const anchor = unitAnchor(entry)
          const progress = clamp((now - floater.startedAt) / Math.max(1, floater.durationMs || 1100), 0, 1)
          const yOffset = 18 + (floater.stackIndex || 0) * 16 + progress * 18
          return (
            <text
              key={floater.id}
              x={anchor.x}
              y={anchor.y - yOffset}
              textAnchor="middle"
              fill={floater.colour}
              fontSize="12"
              fontWeight="700"
              opacity={1 - progress * 0.9}
              pointerEvents="none"
            >
              {floater.text}
            </text>
          )
        })}

        {bullseyeHex ? <TacticalBullseye x={toPixel(bullseyeHex).x} y={toPixel(bullseyeHex).y} colour={hoverAttackPreview?.canAttack ? '#ef4444' : '#94a3b8'} /> : null}
      </svg>
    </div>
  )
}

function TacticalSquadView({ title, units, accent = 'cyan', selectedUnitId, hoveredUnitId, onSelect, onHover, emptyLabel = 'No units listed.' }) {
  const accentClass = accent === 'rose'
    ? 'border-rose-800 bg-rose-950/15'
    : accent === 'mixed'
      ? 'border-slate-800 bg-slate-950/35'
      : 'border-cyan-800 bg-cyan-950/15'
  return (
    <div className={`rounded-2xl border p-2.5 ${accentClass}`}>
      {title ? <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{title}</div> : null}
      <div className={`${title ? 'mt-2' : ''} flex flex-wrap gap-2`}>
        {units.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">{emptyLabel}</div> : null}
        {units.map((unit) => (
          <button
            key={unit.id}
            type="button"
            className={`relative flex min-w-[88px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left ${unit.id === selectedUnitId ? 'border-amber-400 bg-amber-500/15' : hoveredUnitId === unit.id ? 'border-slate-400 bg-slate-900/75' : unit.side === 'enemy' ? 'border-rose-900/70 bg-rose-950/10' : 'border-cyan-900/70 bg-cyan-950/10'} ${unit.canAct ? 'text-slate-100' : 'opacity-45'}`}
            onClick={() => onSelect?.(unit.id)}
            onMouseEnter={() => onHover?.(unit.id)}
            onMouseLeave={() => onHover?.(null)}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold ${unit.side === 'enemy' ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950'}`}>
              {unit.kind === 'ship' ? 'SH' : unit.kind === 'hangar' ? 'HG' : 'DR'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{unit.name}</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{unit.statusLabel || (unit.canAct ? 'Ready' : 'Spent')}</div>
            </div>
            <div className="absolute right-2 top-1 rounded-full bg-slate-950/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100">{unit.countLabel}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TacticalHangarView({ title, units, onDeploy }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-2.5">
      {title ? <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{title}</div> : null}
      <div className={`${title ? 'mt-2' : ''} grid gap-2`}>
        {units.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700/80 px-3 py-4 text-xs text-slate-500">No units waiting.</div> : null}
        {units.map((unit) => (
          <div key={unit.id} className={`rounded-2xl border p-2.5 ${unit.side === 'enemy' ? 'border-rose-900/70 bg-rose-950/10' : 'border-cyan-900/70 bg-cyan-950/10'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-100">{unit.name}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{unit.subtitle}</div>
              </div>
              <div className="rounded-full bg-slate-950/90 px-2 py-1 text-[10px] font-semibold text-slate-100">{unit.countLabel}</div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">{unit.statusLabel}</div>
            <div className="mt-2">
              <ActionButton tone={unit.side === 'player' && unit.deployable ? 'green' : 'slate'} disabled={unit.side !== 'player' || !unit.deployable} onClick={() => onDeploy?.(unit.id)}>Deploy</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CargoGrid({ cargoCapacity, entries, selectedCargoItemId, onSelect, onDragStartItem, onDropCell }) {
  const slots = Array.from({ length: cargoCapacity }, (_, index) => entries[index] || null)
  return (
    <div className="grid grid-cols-8 gap-2">
      {slots.map((item, index) => {
        const selected = item && item.key === selectedCargoItemId
        return (
          <button
            key={item ? item.key : `empty_${index}`}
            className={`aspect-square rounded-xl border text-[10px] font-bold ${item ? 'text-slate-950' : 'bg-slate-950 text-slate-600'} ${selected ? 'ring-2 ring-cyan-400 border-cyan-500' : 'border-slate-700'}`}
            style={item ? { backgroundColor: item.colour || '#94a3b8' } : undefined}
            onClick={() => item && onSelect(item.key)}
            draggable={Boolean(item?.draggable)}
            onDragStart={(event) => item && item.draggable && onDragStartItem?.(event, item, index)}
            onDragOver={(event) => onDropCell ? event.preventDefault() : undefined}
            onDrop={(event) => onDropCell?.(event, index, item)}
            type="button"
          >
            {item ? item.icon : ''}
          </button>
        )
      })}
    </div>
  )
}

function WeaponSlotGrid({ slots, selectedSlotIndex, onSelect, onDragStartSlot, onDropSlot, now = Date.now() }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((weapon, index) => {
        const definition = weapon ? EQUIPMENT_CATALOG[weapon.id] : null
        const selected = index === selectedSlotIndex
        return (
          <button
            key={`weapon_slot_${index}`}
            className={`rounded-2xl border p-2 text-left ${selected ? 'border-cyan-500 ring-2 ring-cyan-400/70' : 'border-slate-700'} ${weapon ? 'bg-slate-900' : 'bg-slate-950/80'}`}
            onClick={() => onSelect(index)}
            draggable={Boolean(weapon)}
            onDragStart={(event) => weapon && onDragStartSlot?.(event, index)}
            onDragOver={(event) => onDropSlot ? event.preventDefault() : undefined}
            onDrop={(event) => onDropSlot?.(event, index)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-slate-950" style={{ backgroundColor: definition?.colour || '#0f172a' }}>{definition?.icon || `W${index + 1}`}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">S{index + 1}</div>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-100">{definition?.name || 'Empty slot'}</div>
            {weapon ? <div className="mt-1 h-2 overflow-hidden rounded-full border border-emerald-900/70 bg-slate-950"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${weaponHpRatio(weapon) * 100}%` }} /></div> : null}
            <div className="mt-1 h-2 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
              <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-100" style={{ width: `${weapon ? weaponChargeRatio(weapon, now) * 100 : 0}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>{weapon ? `${Math.round(weaponChargeRatio(weapon, now) * 100)}% charged` : 'Drop weapon here'}</span>
              <span>{weapon ? `${equipmentPowerDraw(weapon.id)} pw` : ''}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function CombatCrewStrip({ crew, selectedCrewId, onSelect }) {
  const selectedCrew = (crew || []).find((member) => member.id === selectedCrewId) || crew?.[0] || null
  const nextLevelXp = selectedCrew ? xpToNextCrewLevel(selectedCrew) : 0
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-cyan-900/70 bg-slate-950/70 p-3">
        {selectedCrew ? (
          <div>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/90 text-sm font-bold text-slate-950">{selectedCrew.name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-100">{selectedCrew.name}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">{crewRoleLabel(selectedCrew.role)} · Lv {crewLevel(selectedCrew)} · {selectedCrew.xp} xp</div>
                <div className="mt-2 text-sm text-slate-300">{crewDescription(selectedCrew)}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full border border-rose-900/70 bg-slate-950"><div className="h-full rounded-full bg-rose-500" style={{ width: `${((selectedCrew.health || 0) / Math.max(1, selectedCrew.healthMax || 1)) * 100}%` }} /></div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat label="Trait" value={selectedCrew.trait} tone="slate" />
              <MiniStat label="Health" value={`${selectedCrew.health || 0} / ${selectedCrew.healthMax || 0}`} tone="rose" />
              <MiniStat label="Next level" value={nextLevelXp > 0 ? `${nextLevelXp} xp` : 'MAX'} tone="cyan" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No crew available for station assignment.</div>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {(crew || []).map((member) => (
          <button key={member.id} className={`rounded-2xl border px-3 py-3 text-left ${member.id === selectedCrew?.id ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/55'}`} onClick={() => onSelect?.(member.id)} type="button">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-cyan-100">{member.name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{member.name}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{crewRoleLabel(member.role)} · Lv {crewLevel(member)}</div>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-rose-900/70 bg-slate-950"><div className="h-full rounded-full bg-rose-500" style={{ width: `${((member.health || 0) / Math.max(1, member.healthMax || 1)) * 100}%` }} /></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-slate-700 bg-slate-950">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: `${(() => {
                const currentLevel = crewLevel(member)
                if (currentLevel >= CREW_LEVEL_THRESHOLDS.length) return 100
                const previousThreshold = crewXpThresholdForLevel(currentLevel)
                const nextThreshold = crewXpThresholdForLevel(currentLevel + 1)
                const span = Math.max(1, nextThreshold - previousThreshold)
                return clamp((((member.xp || 0) - previousThreshold) / span) * 100, 0, 100)
              })()}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-slate-500">{member.trait}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function RunMenu({ run, setRun }) {
  if (!run) return null
  const menuPanel = run.ui?.menuPanel || 'root'
  return (
    <div className="fixed right-4 top-4 z-50">
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-slate-100 shadow-xl"
          onClick={() => setRun((prev) => setMenuOpen(prev, !prev.ui?.menuOpen))}
        >
          Menu
        </button>
      </div>
      {run.ui?.menuOpen ? (
        <div className="mt-3 w-80 rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Run menu</div>
            {menuPanel !== 'root' ? <button type="button" className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100" onClick={() => setRun((prev) => setMenuPanel(prev, 'root'))}>Back</button> : null}
          </div>
          {menuPanel === 'root' ? (
            <div className="mt-4 grid gap-2">
              <ActionButton onClick={() => setRun((prev) => setMenuPanel(prev, 'options'))}>Options</ActionButton>
              <ActionButton tone="amber" onClick={() => setRun((prev) => setMenuPanel(prev, 'dev'))}>Options dev</ActionButton>
              <ActionButton tone="rose" onClick={() => abandonRunToMenu(setRun)}>Self destruct</ActionButton>
            </div>
          ) : null}
          {menuPanel === 'options' ? (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
              Player-configurable options will go here.
            </div>
          ) : null}
          {menuPanel === 'dev' ? (
            <div className="mt-4 grid gap-2">
              <ActionButton tone="amber" onClick={() => setRun((prev) => devGrantResources(prev))}>Grant Resources</ActionButton>
              <ActionButton tone="amber" onClick={() => setRun((prev) => devRestoreShip(prev))}>Restore Ship</ActionButton>
              <ActionButton tone="amber" disabled={run.screen !== 'combat_hex' || Boolean(run.combat?.outcome)} onClick={() => setRun((prev) => devForceCombatVictory(prev))}>Force Combat Victory</ActionButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const TONE_HEX = { hostile: '#FF6170', fuel: '#FFB443', exit: '#7CF5C8', neutral: '#B7C3D6', accent: '#46E0FF', mute: '#7F90AA' }

function nodeTone(kind) {
  if (['pirate', 'patrol', 'hazard'].includes(kind)) return 'hostile'
  if (['merchant', 'station', 'shipyard', 'depot', 'base_arrival'].includes(kind)) return 'fuel'
  if (kind === 'base_departure') return 'exit'
  if (kind === 'spent' || kind === 'empty') return 'mute'
  return 'neutral'
}

const KIND_ICON = {
  base_arrival: 'station', base_departure: 'exit', station: 'station', shipyard: 'repair', merchant: 'trade',
  planet: 'probe', belt: 'mine', pirate: 'attack', patrol: 'attack', distress: 'hail', hazard: 'attack',
  wreck: 'salvage', anomaly: 'probe', relay: 'relay', convoy: 'cargo', survey: 'probe', depot: 'cargo',
  empty: 'info', spent: 'info',
}

const NPC_TONE = { pirate: 'hostile', patrol: 'hostile', merchant: 'fuel', civilian: 'neutral' }

function nodeDisplayKind(node) {
  return isNodeDepleted(node) && !node.kind.startsWith('base') ? 'spent' : node.kind
}

function nodeTitle(node) {
  if (!node) return ''
  if (node.kind === 'empty') return 'Empty space'
  return node.label || KIND_META[node.kind]?.label || 'Waypoint'
}

function localActionLabel(node) {
  if (!node) return null
  if (['station', 'base_arrival', 'base_departure'].includes(node.kind)) return node.kind === 'base_departure' ? 'Depart' : 'Services'
  return { merchant: 'Trade', belt: 'Mine', depot: 'Salvage', anomaly: 'Probe', relay: 'Relay', shipyard: 'Shipyard' }[node.kind] || null
}

function stationServiceTiles(run) {
  const hullFull = run.player.hull >= run.player.hullMax
  const shieldsFull = run.player.shields >= run.player.shieldsMax
  return [
    { id: 'repair', icon: 'repair', title: 'Repair +16', detail: '4 scrap · 2 parts', disabled: hullFull || run.resources.scrap < 4 || run.resources.parts < 2, note: hullFull ? 'Hull already full' : null, act: repairHull },
    { id: 'refuel', icon: 'fuel', tone: 'fuel', title: 'Refuel +6', detail: '6 scrap', disabled: run.resources.scrap < 6, note: null, act: refuelShip },
    { id: 'recruit', icon: 'recruit', title: 'Recruit', detail: '10 scrap', disabled: crewAtCapacity(run) || run.resources.scrap < 10, note: crewAtCapacity(run) ? 'Berths full' : null, act: recruitCrew },
    { id: 'shields', icon: 'shield', title: 'Shields +10', detail: '1 part', disabled: shieldsFull || run.resources.parts < 1, note: shieldsFull ? 'Already full' : null, act: rechargeShields },
  ]
}

function SystemMap({ run, animatedSystem, reachableIds, selectedNode, current, shipAnimationPos, ghostPos, viewBox, mapFrameRef, gestureRef, handlers, onSelectNode, onSelectNpc }) {
  const system = animatedSystem || run.system
  const meteorPath = run.system.meteorPath
  const locked = Boolean(run.ui.travelAnimation)
  const guard = (event, action) => {
    event.stopPropagation()
    if (locked) return
    if (gestureRef.current.moved) {
      gestureRef.current.moved = false
      return
    }
    action()
  }
  return (
    <div ref={mapFrameRef} className="relative w-full" style={{ touchAction: 'none' }} onTouchStart={handlers.touchStart} onTouchMove={handlers.touchMove} onTouchEnd={handlers.touchEnd} onTouchCancel={handlers.touchEnd} onMouseDown={handlers.mouseDown} onMouseMove={handlers.mouseMove} onMouseUp={handlers.mouseUp} onMouseLeave={handlers.mouseUp} onWheel={handlers.wheel}>
      <svg viewBox={viewBox} className="block aspect-square w-full" role="img" aria-label={`Orbital map of ${run.system.name || 'the system'}`}>
        <defs>
          <radialGradient id="stlStar" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFF4D6" /><stop offset="45%" stopColor="#FFC861" /><stop offset="100%" stopColor="#FF9F2E" stopOpacity="0" /></radialGradient>
        </defs>
        <rect x="0" y="0" width="360" height="360" fill="#060A12" />
        <circle cx="180" cy="180" r="28" fill="url(#stlStar)" opacity="0.5" />
        <circle cx="180" cy="180" r="12" fill="url(#stlStar)" />
        {meteorPath ? (() => { const { p1, p2 } = meteorLineEndpoints(meteorPath); return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFB443" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="7 6" /> })() : null}
        {Array.from({ length: MASTER.orbitCount }, (_, orbit) => {
          const band = ringBand(orbit)
          const slotCount = MASTER.slotCounts[orbit]
          const rotationDeg = orbitRotationDeg(system, orbit)
          return (
            <g key={`orbit_${orbit}`} transform={`rotate(${rotationDeg} 180 180)`}>
              {Array.from({ length: slotCount }, (_, slot) => {
                const segmentNode = findNodeByOrbitSlot(run.system, orbit, slot)
                const reachable = segmentNode && reachableIds.has(segmentNode.id) && segmentNode.id !== current.id
                const selected = selectedNode && selectedNode.orbit === orbit && selectedNode.slot === slot
                const here = current.orbit === orbit && current.slot === slot
                const fill = selected ? 'rgba(70,224,255,0.45)' : reachable ? 'rgba(70,224,255,0.2)' : here ? 'rgba(234,242,255,0.14)' : 'rgba(140,180,230,0.07)'
                return (
                  <path
                    key={`seg_${orbit}_${slot}`}
                    d={describeRingSegment(180, 180, band.inner, band.outer, boundaryAngleOfSlot(slot, slotCount), boundaryAngleOfSlot(slot + 1, slotCount))}
                    fill={fill}
                    stroke="#060A12"
                    strokeWidth={orbit >= 4 ? 0.8 : 1.2}
                    onClick={(event) => guard(event, () => segmentNode && onSelectNode(segmentNode.id))}
                    style={{ cursor: locked ? 'default' : 'pointer' }}
                  />
                )
              })}
            </g>
          )
        })}
        {run.system.nodes.map((node) => {
          if (node.kind === 'empty') return null
          const pos = nodePosition(system, node)
          const kind = nodeDisplayKind(node)
          const colour = TONE_HEX[nodeTone(kind)]
          const selected = node.id === run.selectedNodeId
          const label = node.kind.startsWith('base') ? (node.kind === 'base_arrival' ? 'A' : `D${node.departureIndex + 1}`) : KIND_META[kind]?.symbol
          return (
            <g key={node.id} onClick={(event) => guard(event, () => onSelectNode(node.id))} style={{ cursor: locked ? 'default' : 'pointer' }}>
              <circle cx={pos.x} cy={pos.y} r="13" fill="transparent" />
              {selected ? <circle cx={pos.x} cy={pos.y} r="11" fill="none" stroke="#46E0FF" strokeWidth="2" /> : null}
              <circle cx={pos.x} cy={pos.y} r="7.5" fill="#0B1424" stroke={colour} strokeOpacity={kind === 'spent' ? 0.4 : 0.9} strokeWidth="1.3" />
              <text x={pos.x} y={pos.y + 2.4} textAnchor="middle" fontSize={node.kind.startsWith('base') ? '6.5' : '8'} fontWeight="700" fill={colour} fillOpacity={kind === 'spent' ? 0.5 : 1} style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
            </g>
          )
        })}
        {(run.system.npcs || []).map((npc) => {
          const node = findNode(run.system, npc.currentNodeId)
          if (!node) return null
          const pos = nodePosition(system, node)
          const colour = TONE_HEX[NPC_TONE[npc.kind] || 'neutral']
          const selected = npc.id === run.ui.selectedNpcId
          return (
            <g key={npc.id} onClick={(event) => guard(event, () => onSelectNpc(npc.id))} style={{ cursor: locked ? 'default' : 'pointer' }}>
              <circle cx={pos.x + 9} cy={pos.y - 9} r="12" fill="transparent" />
              {selected ? <circle cx={pos.x + 9} cy={pos.y - 9} r="10" fill="none" stroke="#EAF2FF" strokeWidth="1.8" /> : null}
              <polygon points={`${pos.x + 9},${pos.y - 16} ${pos.x + 15},${pos.y - 4} ${pos.x + 3},${pos.y - 4}`} fill={colour} />
            </g>
          )
        })}
        {ghostPos ? <circle cx={ghostPos.x} cy={ghostPos.y} r="7" fill="none" stroke="#46E0FF" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="2 2" pointerEvents="none" /> : null}
        <g pointerEvents="none" transform={`translate(${shipAnimationPos.x} ${shipAnimationPos.y})`}>
          <circle r="11" fill="none" stroke="#EAF2FF" strokeOpacity="0.6" strokeWidth="1.4" />
          <polygon points="0,-7 5.5,6 0,3 -5.5,6" fill="#EAF2FF" />
        </g>
      </svg>
    </div>
  )
}

function ShipTopDown({ run, onOpenLoadout, onOpenCrew }) {
  const stations = { bridge: [], weapons: [], engines: [], quarters: [] }
  ;(run.crew || []).forEach((member) => {
    if (member.role === 'pilot' || member.role === 'diplomat') stations.bridge.push(member)
    else if (member.role === 'hacker' || crewSkillLevel(member, 'weapon_specialist') > 0) stations.weapons.push(member)
    else if (member.role === 'repair') stations.engines.push(member)
    else stations.quarters.push(member)
  })
  const nodes = [
    { id: 'bridge', icon: 'bridge', label: 'Bridge', status: `Dodge ${Math.round(dodgeChance(run.player.maneuverability + pilotManeuverBonus(run)) * 100)}%`, x: 130, y: 70, onClick: () => onOpenCrew(stations.bridge[0]?.id) },
    { id: 'weapons', icon: 'target', label: 'Weapons', status: `${equippedWeapons(run.player).length} of ${run.player.weaponSlotsMax}`, x: 72, y: 186, onClick: onOpenLoadout },
    { id: 'shields', icon: 'shield', label: 'Shields', status: `${run.player.shields}/${run.player.shieldsMax}`, x: 188, y: 186, onClick: onOpenLoadout },
    { id: 'quarters', icon: 'crew', label: 'Quarters', status: `${run.crew.length} of ${run.player.crewCapacity}`, x: 130, y: 290, onClick: () => onOpenCrew(stations.quarters[0]?.id || run.crew[0]?.id) },
    { id: 'engines', icon: 'engine', label: 'Engines', status: `Speed ${playerSpeedValue(run)}`, x: 130, y: 384, onClick: onOpenLoadout },
  ]
  const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight
  const scale = clamp((viewportHeight - 380) / 460, 0.6, 1)
  return (
    <div className="relative mx-auto" style={{ width: 260 * scale, height: 460 * scale }}>
    <div className="absolute left-0 top-0 h-[460px] w-[260px] origin-top-left" style={{ transform: `scale(${scale})` }}>
      <svg width="260" height="460" viewBox="0 0 260 460" className="absolute inset-0" role="img" aria-label={`${run.shipName} seen from above`}>
        <polygon points="130,0 200,90 226,220 220,360 180,430 80,430 40,360 34,220 60,90" fill="#0C1626" stroke="#46E0FF" strokeOpacity="0.45" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="100" cy="442" rx="14" ry="10" fill="#46E0FF" fillOpacity="0.35" />
        <ellipse cx="160" cy="442" rx="14" ry="10" fill="#46E0FF" fillOpacity="0.35" />
      </svg>
      {nodes.map((node) => (
        <button key={node.id} type="button" onClick={node.onClick} className="absolute flex w-[84px] flex-col items-center gap-1" style={{ left: node.x - 42, top: node.y - 30 }}>
          <span className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-raised text-accent">
            <Icon name={node.icon} size={26} />
            {(stations[node.id] || []).slice(0, 3).map((member, badgeIndex) => (
              <span key={member.id} className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-accent font-display text-[10px] font-bold text-accent-ink" style={{ top: -4 + badgeIndex * 20, right: -10 }}>{member.name.slice(0, 2).toUpperCase()}</span>
            ))}
          </span>
          <span className="text-[13px] leading-tight text-ink">{node.label}</span>
          <span className="text-[11px] leading-tight text-mute">{node.status}</span>
        </button>
      ))}
    </div>
    </div>
  )
}

function ChoiceButton({ title, note, onClick, highlight = null, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[64px] w-full flex-col justify-center gap-0.5 rounded-[18px] px-[18px] py-2.5 text-left transition-transform active:scale-[0.99] disabled:opacity-40 ${highlight ? 'border-2 border-accent bg-accent/10' : 'bg-panel'}`}
    >
      <span className={`font-display text-[17px] font-semibold ${highlight ? 'text-accent' : 'text-ink'}`}>{title}</span>
      {highlight || note ? <span className="text-[14px] text-mute">{[highlight ? `Unlocked by ${highlight}` : null, note].filter(Boolean).join(' · ')}</span> : null}
    </button>
  )
}

function OverlayFrame({ children, tone = 'accent', icon = 'signal' }) {
  const colour = TONE_HEX[tone] || TONE_HEX.accent
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-space">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-4 pb-6">
        <div className="relative -mx-4 flex h-[220px] items-center justify-center overflow-hidden" aria-hidden="true">
          <svg width="390" height="220" viewBox="0 0 390 220">
            <circle cx="195" cy="110" r="22" fill={colour} fillOpacity="0.22" />
            <circle cx="195" cy="110" r="44" fill="none" stroke={colour} strokeOpacity="0.35" />
            <circle cx="195" cy="110" r="72" fill="none" stroke={colour} strokeOpacity="0.16" />
            <circle cx="195" cy="110" r="104" fill="none" stroke={colour} strokeOpacity="0.08" />
          </svg>
          <span className="absolute" style={{ color: colour }}><Icon name={icon} size={34} /></span>
        </div>
        {children}
      </div>
    </div>
  )
}

function EventOverlay({ event, onChoose }) {
  return (
    <OverlayFrame tone="fuel" icon="hail">
      <h1 className="m-0 font-display text-[30px] font-bold leading-tight">{String(event.title || '').replace(/^Random event:\s*/i, '').replace(/^\w/, (char) => char.toUpperCase())}</h1>
      <p className="mb-0 mt-2 text-[17px] leading-relaxed text-[#C2CEDF]">{event.description}</p>
      <div className="flex-1" />
      <div className="mt-6 flex flex-col gap-2.5">
        {event.choices.map((choice) => <ChoiceButton key={choice.id} title={choice.label} note={choice.note} highlight={choice.requirement || null} onClick={() => onChoose(choice.id)} />)}
      </div>
    </OverlayFrame>
  )
}

function OutcomeOverlay({ outcome, onClose }) {
  const tone = outcome.tone === 'rose' ? 'hostile' : outcome.tone === 'amber' ? 'fuel' : outcome.tone === 'green' ? 'exit' : 'accent'
  return (
    <OverlayFrame tone={tone} icon={tone === 'hostile' ? 'attack' : 'check'}>
      <h1 className="m-0 font-display text-[28px] font-bold leading-tight">{outcome.title}</h1>
      {outcome.text ? <p className="mb-0 mt-2 text-[17px] leading-relaxed text-[#C2CEDF]">{outcome.text}</p> : null}
      {Array.isArray(outcome.details) && outcome.details.length > 0 ? (
        <div className="mt-5 flex flex-col gap-2">
          {outcome.details.map((detail, index) => <div key={`${detail}_${index}`} className="rounded-[14px] bg-panel px-4 py-3 font-num text-[17px] font-semibold uppercase tracking-[0.06em]">{detail}</div>)}
        </div>
      ) : null}
      <div className="flex-1" />
      <PrimaryButton className="mt-6" onClick={onClose}>Continue</PrimaryButton>
    </OverlayFrame>
  )
}

function AdvancementOverlay({ crewMember, level, onChoose }) {
  return (
    <OverlayFrame tone="accent" icon="crew">
      <h1 className="m-0 font-display text-[28px] font-bold leading-tight">{crewMember.name} reached level {level}</h1>
      <p className="mb-0 mt-2 text-[17px] text-[#C2CEDF]">Pick one perk to improve.</p>
      <div className="mt-5 flex flex-col gap-4">
        {CREW_SKILL_IDS.map((skillId) => (
          <div key={skillId}>
            <Label className="mb-2">{skillLabel(skillId)} · level {crewSkillLevel(crewMember, skillId)}</Label>
            <div className="grid grid-cols-3 gap-2">
              {CREW_SKILL_DEFS[skillId].perks.map((perk) => (
                <button key={perk.id} type="button" onClick={() => onChoose(skillId, perk.id)} className="flex min-h-[64px] flex-col items-start justify-center rounded-[14px] bg-panel px-3 py-2 text-left">
                  <span className="text-[14px] font-semibold leading-tight">{perk.label}</span>
                  <span className="font-num text-[13px] text-mute">{crewPerkLevel(crewMember, skillId, perk.id)}/5</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </OverlayFrame>
  )
}

function Toast({ message }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div className="max-w-[440px] rounded-[16px] bg-raised px-4 py-3 text-[14px] text-ink shadow-[0_10px_30px_rgba(0,0,0,0.5)]">{message}</div>
    </div>
  )
}

function HereSheetContent({ run, setRun, current, closeSheet }) {
  const act = (fn) => setRun((prev) => fn(prev))
  const npcsHere = (run.system.npcs || []).filter((npc) => npc.currentNodeId === current.id)
  const isStation = ['station', 'base_arrival', 'base_departure'].includes(current.kind)
  return (
    <div className="flex flex-col gap-5">
      {current.description ? <p className="m-0 text-[15px] leading-relaxed text-soft">{current.description}</p> : null}
      {isStation ? (
        <div>
          <div className="mb-3 flex gap-6 text-[15px] text-soft">
            <span><strong className="font-num text-[20px] text-ink">{run.resources.scrap}</strong> scrap</span>
            <span><strong className="font-num text-[20px] text-ink">{run.resources.parts}</strong> parts</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stationServiceTiles(run).map((tile) => <Tile key={tile.id} icon={tile.icon} tone={tile.tone} title={tile.title} detail={tile.detail} note={tile.note} disabled={tile.disabled} onClick={() => act(tile.act)} />)}
          </div>
        </div>
      ) : null}
      {current.kind === 'base_arrival' ? <div className="flex items-center gap-3 rounded-[16px] bg-raised p-4 text-[15px] text-fuel"><Icon name="lock" />You arrived here. Leave from one of the other Cardinal stations.</div> : null}
      {current.kind === 'base_departure' || current.kind === 'base_arrival' ? <RouteCards run={run} setRun={setRun} current={current} closeSheet={closeSheet} /> : null}
      {current.kind === 'belt' ? <PrimaryButton tone="fuel" disabled={!hasMiningLaser(run)} onClick={() => act(mineAsteroidBelt)}>{hasMiningLaser(run) ? 'Mine the belt' : 'Needs a mining laser'}</PrimaryButton> : null}
      {current.kind === 'depot' ? <PrimaryButton tone="fuel" disabled={Boolean(current.salvaged)} onClick={() => act(salvageSupplyDepot)}>{current.salvaged ? 'Already salvaged' : 'Salvage the depot'}</PrimaryButton> : null}
      {current.kind === 'anomaly' ? <PrimaryButton disabled={Boolean(current.spent)} onClick={() => act(probeAnomaly)}>{current.spent ? 'Already probed' : 'Probe the anomaly'}</PrimaryButton> : null}
      {current.kind === 'relay' ? <PrimaryButton disabled={Boolean(current.spent)} onClick={() => act(queryNavigationRelay)}>{current.spent ? 'Already queried' : 'Query the relay'}</PrimaryButton> : null}
      {current.kind === 'merchant' ? <PrimaryButton tone="fuel" onClick={() => act((prev) => openMerchantExchange(prev, current.id, 'node'))}>Trade</PrimaryButton> : null}
      {current.kind === 'shipyard' ? <ShipyardContent run={run} setRun={setRun} /> : null}
      {npcsHere.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Ships here</Label>
          {npcsHere.map((npc) => (
            <div key={npc.id} className="flex items-center gap-3 rounded-[16px] bg-raised p-3">
              <span style={{ color: TONE_HEX[NPC_TONE[npc.kind] || 'neutral'] }}><Icon name={npc.kind === 'merchant' ? 'trade' : npc.kind === 'civilian' ? 'ship' : 'attack'} /></span>
              <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-semibold">{npc.name}</div><div className="text-[13px] text-mute">{CONTACT_SHIP_META[npc.kind].label}</div></div>
              <IconButton icon="hail" label={`Hail ${npc.name}`} className="bg-panel" onClick={() => act((prev) => hailNpcShip(prev, npc.id))} />
              <IconButton icon="attack" label={`Attack ${npc.name}`} className="bg-panel text-hostile-soft" onClick={() => act((prev) => attackNpcShip(prev, npc.id, `Attacked ${npc.name} from open space.`))} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function RouteCards({ run, setRun, current, closeSheet }) {
  const departures = run.system.nodes.filter((node) => node.kind === 'base_departure')
  const lastSystem = run.systemIndex === MASTER.maxSystems
  const [picked, setPicked] = useState(current.kind === 'base_departure' ? current.departureIndex : null)
  const pickedPreview = picked !== null ? run.system.candidatePreviews[picked] : null
  const hereIndex = current.kind === 'base_departure' ? current.departureIndex : null
  const pickedNode = departures.find((node) => node.departureIndex === picked) || null
  return (
    <div className="flex flex-col gap-3">
      <Label>{lastSystem ? 'Final exit' : 'Next system'}</Label>
      <div className="flex items-center gap-1.5" aria-label={`System ${run.systemIndex} of ${MASTER.maxSystems}`}>
        {Array.from({ length: MASTER.maxSystems }, (_, index) => <span key={index} className={`h-1.5 rounded-full ${index + 1 <= run.systemIndex ? 'w-6 bg-accent' : 'flex-1 bg-ink/15'}`} />)}
      </div>
      {lastSystem ? null : departures.map((node) => {
        const index = node.departureIndex
        const preview = run.system.candidatePreviews[index]
        if (!preview) return null
        const threatTone = preview.threat === 'High' ? 'text-hostile-soft' : 'text-soft'
        return (
          <button key={preview.seed} type="button" onClick={() => setPicked(index)} className={`flex min-h-[88px] items-center justify-between gap-3 rounded-[20px] border-2 bg-raised px-4 text-left ${picked === index ? 'border-accent' : 'border-transparent'}`}>
            <span className="flex flex-col gap-1">
              <span className="text-[12px] text-mute">Via Cardinal Station D{index + 1}{hereIndex === index ? ' · you are here' : ''}</span>
              <span className="font-display text-[19px] font-bold">{preview.name}</span>
              <span className={`text-[14px] ${threatTone}`}>{preview.type} · {String(preview.threat).toLowerCase()} threat</span>
            </span>
            <span className="font-num text-[22px] font-bold text-fuel">{preview.transitFuel}<span className="text-[13px] text-mute"> fuel</span></span>
          </button>
        )
      })}
      {pickedPreview ? <p className="m-0 text-[15px] text-soft">{pickedPreview.note}</p> : null}
      {hereIndex !== null && (picked === hereIndex || lastSystem) ? (
        <PrimaryButton tone="exit" onClick={() => { closeSheet(); setRun((prev) => travelToNextSystem(prev, hereIndex)) }}>{lastSystem ? 'Complete the run' : `Depart · ${run.system.candidatePreviews[hereIndex]?.transitFuel ?? '?'} fuel`}</PrimaryButton>
      ) : pickedNode ? (
        <PrimaryButton onClick={() => { closeSheet(); setRun((prev) => ({ ...prev, selectedNodeId: pickedNode.id, ui: { ...prev.ui, view: 'map', sheet: null, selectedNpcId: null } })) }}>Set course to D{picked + 1}</PrimaryButton>
      ) : null}
    </div>
  )
}

function ShipyardContent({ run, setRun }) {
  return (
    <div className="flex flex-col gap-3">
      <Label>New hulls</Label>
      {Object.entries(SHIP_PRESETS).map(([shipClass, preset]) => {
        const netPrice = shipyardNetPrice(run, shipClass)
        const isCurrent = shipClass === run.player.shipClass
        const blocked = isCurrent || run.crew.length > preset.crewCapacity || cargoUsed(run) > preset.cargoCapacity || equippedWeapons(run.player).length > preset.weaponSlots || currentPowerUsage(run) > preset.maxPower || run.resources.credits < netPrice
        return (
          <div key={shipClass} className="flex items-center gap-3 rounded-[16px] bg-raised p-3">
            <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-semibold">{shipClass}</div><div className="text-[13px] text-mute">Hull {preset.hullMax} · cargo {preset.cargoCapacity} · {isCurrent ? 'current hull' : `${netPrice} cr after trade-in`}</div></div>
            <SecondaryButton disabled={blocked} onClick={() => setRun((prev) => buyShipAtShipyard(prev, shipClass))}>{isCurrent ? 'Owned' : 'Buy'}</SecondaryButton>
          </div>
        )
      })}
      <Label className="mt-2">Weapon upgrades</Label>
      {run.player.weaponSlots.filter(Boolean).length === 0 ? <div className="text-[14px] text-mute">No weapons fitted.</div> : run.player.weaponSlots.map((weapon, index) => {
        if (!weapon) return null
        const nextLevel = equipmentLevel((weapon.level || 1) + 1)
        const creditCost = 22 + nextLevel * 12
        const partsCost = 2 + nextLevel
        const maxed = equipmentLevel(weapon.level) >= 5
        return (
          <div key={weapon.instanceId} className="flex items-center gap-3 rounded-[16px] bg-raised p-3">
            <div className="min-w-0 flex-1"><div className="font-display text-[16px] font-semibold">{weapon.name}</div><div className="text-[13px] text-mute">{maxed ? 'Fully upgraded' : `To ${equipmentLevelSuffix(nextLevel)} · ${creditCost} cr · ${partsCost} parts`}</div></div>
            <SecondaryButton disabled={maxed || run.resources.credits < creditCost || run.resources.parts < partsCost} onClick={() => setRun((prev) => upgradeMountedWeaponAtShipyard(prev, index))}>Upgrade</SecondaryButton>
          </div>
        )
      })}
    </div>
  )
}

function TradeSheetContent({ run, setRun, merchantSource }) {
  const stock = merchantSource?.entity?.stock || []
  const tab = run.ui.merchantTab === 'sell' ? 'sell' : 'buy'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-6 text-[15px] text-soft">
        <span><strong className="font-num text-[20px] text-ink">{run.resources.credits}</strong> credits</span>
        <span><strong className="font-num text-[20px] text-ink">{cargoFree(run)}</strong> cargo free</span>
      </div>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-[14px] bg-space p-1">
        {['buy', 'sell'].map((id) => <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setRun((prev) => setMerchantTab(prev, id))} className={`h-11 rounded-[10px] font-display text-[15px] font-semibold capitalize ${tab === id ? 'bg-raised text-ink' : 'text-mute'}`}>{id}</button>)}
      </div>
      {tab === 'buy' ? (
        stock.length === 0 ? <div className="text-[15px] text-mute">Nothing left to buy.</div> : stock.map((item) => {
          const definition = EQUIPMENT_CATALOG[item.itemId]
          const cannotAfford = run.resources.credits < item.price
          const noSpace = cargoFree(run) < (definition?.size || 1)
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-[16px] bg-raised p-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] font-num text-[14px] font-bold text-space" style={{ backgroundColor: definition?.colour || '#94a3b8' }}>{item.itemId === 'Missile_Ammo' ? `M${equipmentLevel(item.missileLevel || item.level)}` : definition?.icon}</span>
              <div className="min-w-0 flex-1"><div className="font-display text-[15px] font-semibold">{equipmentDisplayName(item.itemId, item.level || item.missileLevel || 1, item.itemId === 'Missile_Ammo' ? item.amount : null)}</div><div className="text-[13px] text-mute">{cannotAfford ? 'Not enough credits' : noSpace ? 'No cargo space' : `${item.price} credits`}</div></div>
              <SecondaryButton disabled={cannotAfford || noSpace} onClick={() => setRun((prev) => buyMerchantItem(prev, merchantSource.entity.id, item.id))}>Buy</SecondaryButton>
            </div>
          )
        })
      ) : (
        run.cargo.length === 0 ? <div className="text-[15px] text-mute">No stored equipment to sell.</div> : run.cargo.map((item) => {
          const definition = EQUIPMENT_CATALOG[item.itemId]
          const salePrice = Math.max(3, Math.floor(equipmentPrice(definition, item.level || item.missileLevel || 1) * 0.65))
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-[16px] bg-raised p-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] font-num text-[14px] font-bold text-space" style={{ backgroundColor: definition?.colour || '#94a3b8' }}>{item.itemId === 'Missile_Ammo' ? `M${equipmentLevel(item.missileLevel || item.level)}` : definition?.icon}</span>
              <div className="min-w-0 flex-1"><div className="font-display text-[15px] font-semibold">{equipmentDisplayName(item.itemId, item.level || item.missileLevel || 1, item.itemId === 'Missile_Ammo' ? item.amount : null)}</div><div className="text-[13px] text-mute">{salePrice} credits</div></div>
              <SecondaryButton onClick={() => setRun((prev) => sellCargoItem(prev, merchantSource.entity.id, item.id))}>Sell</SecondaryButton>
            </div>
          )
        })
      )}
    </div>
  )
}

function LoadoutSheetContent({ run, setRun, cargoEntries }) {
  const [selected, setSelected] = useState(null)
  const firstEmptySlot = run.player.weaponSlots.findIndex((slot) => !slot)
  const stats = [
    ['Hull', `${run.player.hull}/${run.player.hullMax}`], ['Shields', `${run.player.shields}/${run.player.shieldsMax}`], ['Armour', run.player.armour],
    ['Speed', playerSpeedValue(run)], ['Stealth', playerStealthValue(run)], ['Power', `${currentPowerUsage(run)}/${run.player.maxPower}`],
    ['Fuel', fuelStorageSummary(run)], ['Ammo', run.resources.kinetic_ammo || 0], ['Cargo', `${cargoUsed(run)}/${run.player.cargoCapacity}`],
  ]
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => <div key={label} className="rounded-[14px] bg-raised px-3 py-2"><div className="text-[12px] text-mute">{label}</div><div className="font-num text-[18px] font-bold">{value}</div></div>)}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Weapons · {currentPowerUsage(run)}/{run.player.maxPower} power</Label>
        {run.player.weaponSlots.map((weapon, index) => {
          const isSelected = selected?.kind === 'slot' && selected.index === index
          if (!weapon) {
            return <div key={`empty_${index}`} className="flex min-h-[56px] items-center rounded-[16px] border border-dashed border-line px-4 text-[14px] text-mute">Empty hardpoint {index + 1}</div>
          }
          return (
            <div key={weapon.instanceId} className={`rounded-[16px] bg-raised ${isSelected ? 'ring-2 ring-accent' : ''}`}>
              <button type="button" onClick={() => setSelected(isSelected ? null : { kind: 'slot', index })} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left">
                <div className="min-w-0 flex-1"><div className="font-display text-[15px] font-semibold">{weapon.name}</div><div className="text-[13px] text-mute">Damage {weapon.damage} · {Math.round((weapon.accuracy || 0) * 100)}% · {equipmentPowerDraw(weapon.id)} power{weapon.broken ? ' · broken' : ''}</div></div>
                <span className="font-num text-[14px] text-mute">{Math.round(weapon.hp || 0)}/{weapon.maxHp}</span>
              </button>
              {isSelected ? (
                <div className="flex gap-2 px-4 pb-3">
                  {weapon.broken ? <SecondaryButton tone="fuel" onClick={() => setRun((prev) => repairBrokenWeapon(prev, index))}>Repair ({brokenWeaponRepairCost(run, weapon).parts}p · {brokenWeaponRepairCost(run, weapon).scrap}s)</SecondaryButton> : null}
                  <SecondaryButton onClick={() => { setSelected(null); setRun((prev) => moveWeaponSlotToCargo(prev, index)) }}>Move to cargo</SecondaryButton>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Cargo · {cargoFree(run)} free</Label>
        {cargoEntries.length === 0 ? <div className="text-[14px] text-mute">The hold is empty.</div> : cargoEntries.map((entry) => {
          const isSelected = selected?.kind === 'cargo' && selected.key === entry.key
          const canInstall = entry.kind === 'equipment' && entry.draggable && firstEmptySlot >= 0
          return (
            <div key={entry.key} className={`rounded-[16px] bg-raised ${isSelected ? 'ring-2 ring-accent' : ''}`}>
              <button type="button" onClick={() => setSelected(isSelected ? null : { kind: 'cargo', key: entry.key })} className="flex min-h-[56px] w-full items-center gap-3 px-3 text-left">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] font-num text-[13px] font-bold text-space" style={{ backgroundColor: entry.colour || '#FFB443' }}>{entry.icon}</span>
                <div className="min-w-0 flex-1"><div className="font-display text-[15px] font-semibold">{entry.title}</div><div className="text-[13px] text-mute">{entry.subtitle}</div></div>
              </button>
              {isSelected ? (
                <div className="flex flex-col gap-2 px-4 pb-3">
                  <div className="text-[14px] text-soft">{entry.description}</div>
                  {entry.kind === 'equipment' && entry.draggable ? <SecondaryButton disabled={!canInstall} onClick={() => { setSelected(null); setRun((prev) => moveCargoWeaponToSlot(prev, entry.key, firstEmptySlot)) }}>{canInstall ? `Fit to hardpoint ${firstEmptySlot + 1}` : 'No free hardpoint'}</SecondaryButton> : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CrewSheetContent({ run, setRun, dockedAtCardinalBase }) {
  const [confirmId, setConfirmId] = useState(null)
  const selectedId = run.ui.selectedCrewId
  return (
    <div className="flex flex-col gap-2">
      {run.crew.length === 0 ? <div className="text-[15px] text-mute">No crew remain aboard.</div> : run.crew.map((member) => {
        const open = member.id === selectedId
        const skills = CREW_SKILL_IDS.filter((skillId) => crewSkillLevel(member, skillId) > 0)
        return (
          <div key={member.id} className={`rounded-[18px] bg-raised ${open ? 'ring-2 ring-accent' : ''}`}>
            <button type="button" onClick={() => setRun((prev) => selectCrewMember(prev, open ? null : member.id))} className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-accent-ink">{member.name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[16px] font-semibold">{member.name}</div>
                <div className="text-[13px] text-mute">{crewRoleLabel(member.role)} · level {crewLevel(member)}{crewHasWantedStatus(member) ? ' · wanted' : ''}</div>
              </div>
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-hostile/20"><span className="block h-full bg-hostile" style={{ width: `${((member.health || 0) / Math.max(1, member.healthMax || 1)) * 100}%` }} /></span>
            </button>
            {open ? (
              <div className="flex flex-col gap-3 px-4 pb-4">
                <div className="text-[14px] text-soft">{crewDescription(member)}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-[12px] bg-panel py-2"><div className="font-num text-[17px] font-bold">{member.xp}</div><div className="text-[12px] text-mute">XP</div></div>
                  <div className="rounded-[12px] bg-panel py-2"><div className="font-num text-[17px] font-bold">{xpToNextCrewLevel(member) > 0 ? xpToNextCrewLevel(member) : 'Max'}</div><div className="text-[12px] text-mute">to next level</div></div>
                  <div className="rounded-[12px] bg-panel py-2"><div className="font-num text-[17px] font-bold">{member.health || 0}/{member.healthMax || 0}</div><div className="text-[12px] text-mute">health</div></div>
                </div>
                {skills.length > 0 ? skills.map((skillId) => (
                  <div key={skillId} className="text-[14px] text-soft"><span className="text-ink">{skillLabel(skillId)} {crewSkillLevel(member, skillId)}</span> · {CREW_SKILL_DEFS[skillId].perks.map((perk) => `${perk.label} ${crewPerkLevel(member, skillId, perk.id)}`).join(' · ')}</div>
                )) : <div className="text-[14px] text-mute">No specialisations yet.</div>}
                {crewHasWantedStatus(member) ? <div className="text-[14px] text-hostile-soft">Wanted for {member.wantedReason}.</div> : null}
                {confirmId === member.id ? (
                  <div className="flex gap-2">
                    <SecondaryButton tone={dockedAtCardinalBase ? 'fuel' : 'hostile'} onClick={() => { setConfirmId(null); setRun((prev) => removeCrewMember(prev, member.id)) }}>{dockedAtCardinalBase ? 'Confirm disembark' : 'Confirm: this is fatal'}</SecondaryButton>
                    <SecondaryButton onClick={() => setConfirmId(null)}>Cancel</SecondaryButton>
                  </div>
                ) : (
                  <SecondaryButton tone={dockedAtCardinalBase ? 'fuel' : 'hostile'} onClick={() => setConfirmId(member.id)}>{dockedAtCardinalBase ? 'Disembark here' : 'Eject into space'}</SecondaryButton>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function LogSheetContent({ run }) {
  return (
    <div className="flex flex-col gap-2">
      {run.log.map((entry, index) => {
        const entryTurn = extractLogTurn(entry)
        return (
          <div key={`${entry}_${index}`} className="rounded-[14px] bg-raised px-4 py-3">
            {entryTurn !== null ? <div className="font-num text-[12px] font-semibold uppercase tracking-[0.12em] text-mute">Turn {entryTurn}</div> : null}
            <div className="text-[15px] text-ink">{rawLogText(entry)}</div>
          </div>
        )
      })}
    </div>
  )
}

function LegendSheetContent({ run }) {
  const rows = [
    ['hostile', 'Pirates, patrols and hazards'],
    ['fuel', 'Stations, merchants and depots'],
    ['exit', 'Cardinal exits to the next system'],
    ['neutral', 'Planets, belts, wrecks and signals'],
    ['accent', 'Waypoints you can jump to'],
  ]
  return (
    <div className="flex flex-col gap-3">
      {rows.map(([tone, text]) => <div key={tone} className="flex items-center gap-3 text-[15px]"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: TONE_HEX[tone] }} />{text}</div>)}
      {run.system.meteorPath ? <div className="flex items-center gap-3 text-[15px]"><span className="h-0.5 w-4 bg-fuel" />Meteor stream: {run.system.meteorPath.description}</div> : null}
      <div className="mt-2 text-[14px] text-mute">Every ring turns after each jump or wait, so plan one move ahead.</div>
    </div>
  )
}

function InfoSheetContent({ run, node, current, risk, travelMode }) {
  const forecast = node ? orbitForecast(run.system, node) : null
  return (
    <div className="flex flex-col gap-3 text-[15px] text-soft">
      {node?.description ? <p className="m-0 leading-relaxed">{node.description}</p> : null}
      {node?.opportunity ? <div><span className="text-mute">Opportunity · </span>{node.opportunity}</div> : null}
      {node?.danger ? <div><span className="text-mute">Danger · </span>{node.danger}</div> : null}
      <div><span className="text-mute">System · </span>{run.system.type} · police {Math.round((run.system.policePressure || 0) * 100)}% · pirates {Math.round((run.system.piratePressure || 0) * 100)}% · alert {run.system.securityAlert || 0}</div>
      {risk ? <div><span className="text-mute">Detection on this move · </span>police {Math.round(risk.policeChance * 100)}% · pirates {Math.round(risk.pirateChance * 100)}%{travelMode === 'meteor' ? ' (meteor ride)' : ''}</div> : null}
      {forecast && node?.id !== current.id ? <div><span className="text-mute">Ring {node.orbit + 1} forecast · </span>segment {forecast.currentGlobalSlot + 1} now, then {forecast.futureSlots.map((slot) => slot + 1).join(' → ')}</div> : null}
    </div>
  )
}

function MenuSheetContent({ run, setRun, onOpen, inCombat = false }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      {!inCombat ? <SecondaryButton onClick={() => onOpen('log')}>Ship log</SecondaryButton> : null}
      {!inCombat ? <SecondaryButton onClick={() => onOpen('legend')}>Map legend</SecondaryButton> : null}
      <Label className="mt-3">Test tools</Label>
      <SecondaryButton tone="fuel" onClick={() => setRun((prev) => devGrantResources(prev))}>Grant resources</SecondaryButton>
      <SecondaryButton tone="fuel" onClick={() => setRun((prev) => devRestoreShip(prev))}>Restore ship</SecondaryButton>
      {inCombat ? <SecondaryButton tone="fuel" disabled={Boolean(run.combat?.outcome)} onClick={() => setRun((prev) => devForceCombatVictory(prev))}>Force combat victory</SecondaryButton> : null}
      <Label className="mt-3">Run</Label>
      {confirm ? (
        <div className="flex gap-2">
          <SecondaryButton tone="hostile" onClick={() => abandonRunToMenu(setRun)}>Confirm self-destruct</SecondaryButton>
          <SecondaryButton onClick={() => setConfirm(false)}>Cancel</SecondaryButton>
        </div>
      ) : <SecondaryButton tone="hostile" onClick={() => setConfirm(true)}>Self-destruct and end run</SecondaryButton>}
    </div>
  )
}

const FLEET_HEX = 30
const FLEET_MARGIN = 14

function fleetGeometry() {
  const s = FLEET_HEX
  const m = FLEET_MARGIN
  const half = (Math.sqrt(3) / 2) * s
  const axMax = Math.sqrt(3) * s * (HEX_ARENA.cols - 0.5)
  const width = (1.5 * s * (HEX_ARENA.rows - 1) + 2 * s) + 2 * m
  const height = axMax + 2 * half + 2 * m
  const toDisplay = (hex) => {
    const center = hexArenaCenter(hex.col, hex.row, s)
    return { x: center.y + s + m, y: axMax + half + m - center.x }
  }
  const polygon = (point, radius = s) => Array.from({ length: 6 }, (_, index) => {
    const angle = (60 * index) * (Math.PI / 180)
    return `${point.x + radius * Math.cos(angle)},${point.y + radius * Math.sin(angle)}`
  }).join(' ')
  return { s, width, height, toDisplay, polygon }
}

function fleetCentroid(geometry, hexes) {
  const points = hexes.map((hex) => geometry.toDisplay(hex))
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 })
  return { x: sum.x / Math.max(1, points.length), y: sum.y / Math.max(1, points.length) }
}

function fleetShipCentroid(geometry, side, unitLike) {
  return fleetCentroid(geometry, hexCombatShipFootprint(buildHexShipUnit(side, unitLike)))
}

function FleetShipShape({ x, y, side, s, colour, ghost = false, shieldRatio = 0 }) {
  const path = side === 'player'
    ? `M0,${-1.25 * s} L${0.72 * s},${0.9 * s} L${0.24 * s},${0.6 * s} L0,${s} L${-0.24 * s},${0.6 * s} L${-0.72 * s},${0.9 * s} Z`
    : `M0,${1.2 * s} L${0.8 * s},${-0.2 * s} L${0.45 * s},${-0.95 * s} L${-0.45 * s},${-0.95 * s} L${-0.8 * s},${-0.2 * s} Z`
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      {!ghost && shieldRatio > 0 ? <ellipse rx={1.2 * s} ry={1.55 * s} fill="none" stroke={colour} strokeOpacity={0.15 + shieldRatio * 0.45} strokeWidth="2" /> : null}
      <path d={path} fill={ghost ? 'none' : side === 'player' ? '#0F1C2E' : '#2A0E14'} stroke={colour} strokeWidth="2.2" strokeDasharray={ghost ? '5 4' : undefined} strokeLinejoin="round" opacity={ghost ? 0.8 : 1} />
      {!ghost && side === 'player' ? <circle cy={s} r={0.16 * s} fill={colour} /> : null}
    </g>
  )
}

function FleetDroneShape({ x, y, side, count, s, colour, ghost = false }) {
  const slots = [[-0.42, -0.28], [0, -0.48], [0.42, -0.28], [-0.42, 0.28], [0, 0.08], [0.42, 0.28]]
  const point = side === 'player' ? '0,-5 4,4 -4,4' : '0,5 4,-4 -4,-4'
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" opacity={ghost ? 0.6 : 1}>
      <circle r={0.72 * s} fill="none" stroke={colour} strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray={ghost ? '3 3' : undefined} />
      {slots.slice(0, Math.max(0, count)).map(([dx, dy], index) => <polygon key={index} points={point} transform={`translate(${dx * s} ${dy * s})`} fill={colour} />)}
    </g>
  )
}

function FleetArena({ run, now, onSelectOwn, onTapEnemy, onPlanShip, onPlanSquadron }) {
  const combat = run.combat
  const geometry = fleetGeometry()
  const { s } = geometry
  const orders = combat.orders || {}
  const lastRound = combat.lastRound
  const playing = Boolean(lastRound && now - lastRound.at < FLEET_ROUND_PLAYBACK_MS)
  const moveProgress = lastRound && playing ? clamp((now - lastRound.at) / FLEET_MOVE_PLAYBACK_MS, 0, 1) : 1
  const eased = 1 - (1 - moveProgress) * (1 - moveProgress)
  const planning = fleetCombatActive(run) && !playing && !(lastRound && !lastRound.seen)
  const selectedEntry = findCombatUnit(run, combat.selectedUnitId)
  const weaponIndex = Number.isInteger(run.ui.selectedCombatWeaponIndex) ? run.ui.selectedCombatWeaponIndex : null

  const anchorFor = (entry) => {
    if (!entry) return null
    const finalPoint = entry.kind === 'ship' ? fleetShipCentroid(geometry, entry.side, entry.unit) : geometry.toDisplay(entry.unit.position)
    const from = lastRound?.before?.[entry.unit.id]
    if (!from || eased >= 1) return finalPoint
    const startPoint = entry.kind === 'ship' ? fleetShipCentroid(geometry, entry.side, { ...entry.unit, col: from.col, row: from.row }) : geometry.toDisplay({ col: from.col, row: from.row })
    return { x: startPoint.x + (finalPoint.x - startPoint.x) * eased, y: startPoint.y + (finalPoint.y - startPoint.y) * eased }
  }
  const plannedAnchor = (entry) => {
    const move = orders[entry.unit.id]?.move
    if (!move) return null
    return entry.kind === 'ship' ? fleetShipCentroid(geometry, entry.side, { ...entry.unit, col: move.col, row: move.row }) : geometry.toDisplay(move)
  }
  const playerShip = findCombatUnit(run, combat.playerShipUnit.id)
  const enemyShip = findCombatUnit(run, combat.enemyShipUnit.id)
  const squadrons = (combat.squadrons || []).filter((entry) => squadronAliveCount(entry) > 0).map((squadron) => findCombatUnit(run, squadron.id)).filter(Boolean)
  const shipOptions = planning && selectedEntry?.kind === 'ship' ? fleetShipMoveOptions(run) : []
  const squadronHexes = planning && selectedEntry?.kind === 'squadron' && selectedEntry.side === 'player' ? fleetSquadronMoveHexes(run, selectedEntry.unit.id) : []
  const shipFrom = plannedAnchor(playerShip) || anchorFor(playerShip)
  const activeEffects = (combat.effects || []).filter((effect) => now >= (effect.startedAt || 0) && now - (effect.startedAt || 0) <= (effect.durationMs || 820))
  const activeFloaters = (combat.floaters || []).filter((entry) => now >= (entry.startedAt || 0) && now - (entry.startedAt || 0) <= (entry.durationMs || 1100))

  return (
    <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Battle grid: ${run.shipName} and its drones at the bottom, ${combat.enemy.name} at the top`}>
      {Array.from({ length: HEX_ARENA.rows }, (_, row) => Array.from({ length: HEX_ARENA.cols }, (_, col) => {
        const point = geometry.toDisplay({ col, row })
        return <polygon key={`${col}:${row}`} points={geometry.polygon(point, s - 1)} fill="rgba(140,180,230,0.035)" stroke="rgba(140,190,255,0.12)" strokeWidth="1" />
      }))}

      {squadronHexes.map((hex) => {
        const point = geometry.toDisplay(hex)
        const planned = orders[selectedEntry.unit.id]?.move && hexEquals(orders[selectedEntry.unit.id].move, hex)
        return <polygon key={`move_${hex.col}_${hex.row}`} points={geometry.polygon(point, s - 2.5)} fill={planned ? 'rgba(70,224,255,0.35)' : 'rgba(70,224,255,0.12)'} stroke="rgba(70,224,255,0.35)" strokeWidth="1" style={{ cursor: 'pointer' }} onClick={() => onPlanSquadron(selectedEntry.unit.id, hex)} />
      })}

      {shipOptions.map((option) => {
        const point = fleetShipCentroid(geometry, 'player', { ...combat.playerShipUnit, col: option.col, row: option.row })
        const planned = orders[combat.playerShipUnit.id]?.move?.col === option.col && orders[combat.playerShipUnit.id]?.move?.row === option.row
        return (
          <g key={`ship_opt_${option.col}_${option.row}`} style={{ cursor: 'pointer' }} onClick={() => onPlanShip(option)}>
            <circle cx={point.x} cy={point.y} r={0.62 * s} fill="transparent" />
            <circle cx={point.x} cy={point.y} r={0.3 * s} fill={planned ? '#46E0FF' : 'rgba(70,224,255,0.25)'} stroke="#46E0FF" strokeOpacity="0.8" strokeWidth="1.4" data-move-option="ship" />
          </g>
        )
      })}

      {[playerShip, ...squadrons.filter((entry) => entry.side === 'player')].map((entry) => {
        const target = plannedAnchor(entry)
        const from = anchorFor(entry)
        if (!target || !from || !planning) return null
        return (
          <g key={`plan_${entry.unit.id}`} pointerEvents="none">
            <line x1={from.x} y1={from.y} x2={target.x} y2={target.y} stroke="#46E0FF" strokeWidth="2" strokeDasharray="6 6" />
            {entry.kind === 'ship' ? <FleetShipShape x={target.x} y={target.y} side="player" s={s} colour="#46E0FF" ghost /> : <FleetDroneShape x={target.x} y={target.y} side="player" count={squadronAliveCount(entry.unit)} s={s} colour="#46E0FF" ghost />}
          </g>
        )
      })}

      {planning ? run.player.weaponSlots.map((weapon, index) => {
        if (!weapon) return null
        const target = findCombatUnit(run, fleetWeaponTarget(run, weapon))
        const to = anchorFor(target)
        if (!to || !shipFrom) return null
        const selected = index === weaponIndex && selectedEntry?.kind === 'ship'
        return (
          <g key={`aim_${weapon.instanceId}`} pointerEvents="none">
            <line x1={shipFrom.x} y1={shipFrom.y} x2={to.x} y2={to.y} stroke="#46E0FF" strokeOpacity={selected ? 0.9 : 0.25} strokeWidth={selected ? 2.2 : 1.2} strokeDasharray="3 6" />
            {selected ? <text x={(shipFrom.x + to.x) / 2 + 10} y={(shipFrom.y + to.y) / 2} fill="#46E0FF" fontSize="15" fontWeight="700" fontFamily="'Barlow Condensed', sans-serif">{Math.round((weapon.accuracy || 0) * 100)}%</text> : null}
          </g>
        )
      }) : null}

      {planning && selectedEntry?.kind === 'squadron' && selectedEntry.side === 'player' ? (() => {
        const target = findCombatUnit(run, fleetSquadronTarget(run, selectedEntry.unit))
        const from = plannedAnchor(selectedEntry) || anchorFor(selectedEntry)
        const to = anchorFor(target)
        if (!from || !to) return null
        return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#46E0FF" strokeOpacity="0.6" strokeWidth="1.6" strokeDasharray="2 5" pointerEvents="none" />
      })() : null}

      {[enemyShip, playerShip].map((entry) => {
        const point = anchorFor(entry)
        const isPlayer = entry.side === 'player'
        const entity = isPlayer ? run.player : combat.enemy
        const selected = planning && combat.selectedUnitId === entry.unit.id
        const targeted = planning && !isPlayer && (selectedEntry?.kind === 'ship' ? fleetWeaponTarget(run, run.player.weaponSlots[weaponIndex] || null) === entry.unit.id : selectedEntry?.kind === 'squadron' ? fleetSquadronTarget(run, selectedEntry.unit) === entry.unit.id : false)
        const colour = isPlayer ? '#46E0FF' : '#FF6170'
        return (
          <g key={entry.unit.id} style={{ cursor: 'pointer' }} onClick={() => (isPlayer ? onSelectOwn(entry.unit.id) : onTapEnemy(entry.unit.id))}>
            <circle cx={point.x} cy={point.y} r={1.5 * s} fill="transparent" />
            {selected ? <circle cx={point.x} cy={point.y} r={1.45 * s} fill={colour} fillOpacity="0.08" stroke={colour} strokeOpacity="0.6" strokeWidth="1.5" /> : null}
            {targeted ? <path d={`M${point.x - 1.5 * s} ${point.y - 1.1 * s}v${-0.4 * s}h${0.4 * s}M${point.x + 1.1 * s} ${point.y - 1.5 * s}h${0.4 * s}v${0.4 * s}M${point.x + 1.5 * s} ${point.y + 1.1 * s}v${0.4 * s}h${-0.4 * s}M${point.x - 1.1 * s} ${point.y + 1.5 * s}h${-0.4 * s}v${-0.4 * s}`} fill="none" stroke="#FF6170" strokeWidth="2.6" /> : null}
            <g opacity={entity.hull <= 0 ? 0.3 : 1}><FleetShipShape x={point.x} y={point.y} side={entry.side} s={s} colour={colour} ghost={entity.hull <= 0} shieldRatio={entity.shieldsMax ? entity.shields / entity.shieldsMax : 0} /></g>
          </g>
        )
      })}

      {squadrons.map((entry) => {
        const point = anchorFor(entry)
        const isPlayer = entry.side === 'player'
        const colour = isPlayer ? '#46E0FF' : '#FF6170'
        const selected = planning && combat.selectedUnitId === entry.unit.id
        const targeted = planning && !isPlayer && (selectedEntry?.kind === 'squadron' ? fleetSquadronTarget(run, selectedEntry.unit) === entry.unit.id : selectedEntry?.kind === 'ship' ? fleetWeaponTarget(run, run.player.weaponSlots[weaponIndex] || null) === entry.unit.id : false)
        return (
          <g key={entry.unit.id} style={{ cursor: 'pointer' }} onClick={() => (isPlayer ? onSelectOwn(entry.unit.id) : onTapEnemy(entry.unit.id))}>
            <circle cx={point.x} cy={point.y} r={0.95 * s} fill="transparent" />
            {selected ? <circle cx={point.x} cy={point.y} r={0.95 * s} fill={colour} fillOpacity="0.08" stroke={colour} strokeOpacity="0.6" strokeWidth="1.5" /> : null}
            {targeted ? <circle cx={point.x} cy={point.y} r={0.95 * s} fill="none" stroke="#FF6170" strokeWidth="2.4" strokeDasharray="5 4" /> : null}
            <FleetDroneShape x={point.x} y={point.y} side={entry.side} count={squadronAliveCount(entry.unit)} s={s} colour={colour} />
          </g>
        )
      })}

      {activeEffects.map((effect) => {
        const from = anchorFor(findCombatUnit(run, effect.fromUnitId))
        const to = anchorFor(findCombatUnit(run, effect.toUnitId))
        if (!from || !to) return null
        const progress = clamp((now - effect.startedAt) / Math.max(1, effect.durationMs || 820), 0, 1)
        const x = from.x + (to.x - from.x) * progress
        const y = from.y + (to.y - from.y) * progress
        return (
          <g key={effect.id} pointerEvents="none" opacity={1 - progress * 0.25}>
            <line x1={from.x} y1={from.y} x2={x} y2={y} stroke={effect.colour} strokeWidth={effect.kind === 'missile' ? 3 : 2.4} strokeDasharray={effect.kind === 'kinetic' ? '4 6' : undefined} />
            <circle cx={x} cy={y} r={effect.kind === 'missile' ? 5 : 3.5} fill={effect.colour} />
            {progress > 0.85 && effect.hit ? <circle cx={to.x} cy={to.y} r={0.7 * s} fill={effect.colour} opacity="0.3" /> : null}
          </g>
        )
      })}

      {activeFloaters.map((floater) => {
        const point = anchorFor(findCombatUnit(run, floater.targetId))
        if (!point) return null
        const progress = clamp((now - floater.startedAt) / Math.max(1, floater.durationMs || 1100), 0, 1)
        return <text key={floater.id} x={point.x} y={point.y - 1.3 * s - (floater.stackIndex || 0) * 17 - progress * 16} textAnchor="middle" fill={floater.colour} fontSize="16" fontWeight="700" fontFamily="'Barlow Condensed', sans-serif" opacity={1 - progress * 0.85} pointerEvents="none">{floater.text}</text>
      })}
    </svg>
  )
}

function enemySystemStatus(run) {
  const enemy = run.combat.enemy
  const systems = run.combat.enemySystems || {}
  const weapons = (enemy.weapons || []).filter(Boolean)
  const crew = enemy.crew || []
  return {
    hull: `${Math.round(enemy.hull)}/${enemy.hullMax}`,
    weapons: `${weapons.filter((weapon) => !weapon.broken).length}/${weapons.length} armed`,
    shields: systems.shieldLayersDisabled > 0 ? `${systems.shieldLayersDisabled} layer${systems.shieldLayersDisabled === 1 ? '' : 's'} down` : enemy.shields > 0 ? 'online' : 'drained',
    engines: (systems.engineDamage || 0) > 0 ? `damaged ${systems.engineDamage}` : 'online',
    crew: `${crew.filter((member) => (member.health ?? 1) > 0).length}/${crew.length} standing`,
  }
}

function weaponShortName(weapon) {
  return String(weapon?.name || '').replace(/ Mk \d+$/, '').replace(/ I$/, '')
}

function weaponStateLabel(run, weapon) {
  if (weapon.broken) return 'Broken'
  if (weapon.enabled === false) return 'Unpowered'
  if (weapon.ammoType === 'missile' && (weapon.ammoLeft || 0) <= 0) return 'Reloading'
  if (weapon.ammoType && weapon.ammoType !== 'missile' && (run.resources[weapon.ammoType] || 0) <= 0) return 'No ammo'
  if ((weapon.hexReadyIn || 0) > 0) return 'Cooling'
  return null
}

function FleetCombatScreen({ run, setRun, now }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const combat = run.combat
  const enemy = combat.enemy
  const lastRound = combat.lastRound
  const playing = Boolean(lastRound && now - lastRound.at < FLEET_ROUND_PLAYBACK_MS)
  const showSummary = Boolean(lastRound && !lastRound.seen && !playing)
  const selectedEntry = findCombatUnit(run, combat.selectedUnitId)
  const weaponIndex = Number.isInteger(run.ui.selectedCombatWeaponIndex) ? run.ui.selectedCombatWeaponIndex : null
  const selectedWeapon = weaponIndex !== null ? run.player.weaponSlots[weaponIndex] : null
  const playerSquadron = activeSquadron(combat, 'player')
  const enemyUnits = combatUnitSummaries(run, 'enemy')
  const enemyLayers = shieldLayerCount({ shieldsMax: enemy.shieldsMax, shields: enemy.shields })
  const enemyCharged = chargedShieldLayers({ shieldsMax: enemy.shieldsMax, shields: enemy.shields })
  const shipOrder = combat.orders?.[combat.playerShipUnit.id]?.move
  const squadronOrder = playerSquadron ? combat.orders?.[playerSquadron.id] : null
  const status = enemySystemStatus(run)
  const act = (fn) => setRun((prev) => fn(prev))
  const tapEnemy = (unitId) => {
    if (!fleetCombatActive(run)) return
    if (selectedEntry?.kind === 'squadron' && selectedEntry.side === 'player') act((prev) => aimFleetSquadron(prev, selectedEntry.unit.id, unitId))
    else act((prev) => aimFleetWeapon(selectFleetWeapon(prev, weaponIndex ?? prev.player.weaponSlots.findIndex(Boolean)), weaponIndex ?? prev.player.weaponSlots.findIndex(Boolean), unitId))
  }
  const weaponTargetEntry = selectedWeapon ? findCombatUnit(run, fleetWeaponTarget(run, selectedWeapon)) : null
  const fleeChance = Math.round(escapeChanceAgainst(run, enemy.kind) * 100)

  const roundLines = lastRound && !lastRound.seen ? lastRound.summary : []
  const summaryList = roundLines.length > 0 ? (
    <div className="flex flex-col gap-2">
      {roundLines.map((line, index) => (
        <div key={index} className="flex items-center gap-2.5 text-[16px]"><span className={`h-2 w-2 flex-none rounded-full ${line.tone === 'good' ? 'bg-accent' : line.tone === 'bad' ? 'bg-hostile' : 'bg-mute'}`} />{line.text}</div>
      ))}
    </div>
  ) : null

  let panel
  if (playing) {
    const progress = clamp((now - lastRound.at) / FLEET_ROUND_PLAYBACK_MS, 0, 1)
    panel = (
      <div className="flex flex-col gap-3 py-2">
        <div className="font-display text-[18px] font-semibold tracking-[0.08em]">Executing round {lastRound.number}</div>
        <div className="h-1.5 overflow-hidden rounded-full bg-accent/20"><div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} /></div>
      </div>
    )
  } else if (combat.outcome) {
    const reward = Object.entries(combat.outcome.reward || {}).filter(([, value]) => value).map(([key, value]) => `+${value} ${key}`).join(' · ')
    panel = (
      <div className="flex flex-col gap-3">
        {summaryList}
        <div className="font-display text-[22px] font-bold">{combat.outcome.title}</div>
        {reward ? <div className="text-[16px] text-exit">{reward}</div> : null}
        <PrimaryButton onClick={() => act(continueAfterCombat)}>Continue</PrimaryButton>
      </div>
    )
  } else if (combat.negotiation) {
    panel = (
      <div className="flex flex-col gap-3">
        <div className="font-display text-[18px] font-semibold">{combat.negotiation.side === 'enemy' ? 'They want out' : 'Counteroffer'}</div>
        <div className="text-[15px] text-soft">{combat.negotiation.text}</div>
        <div className="flex gap-2.5">
          <SecondaryButton className="h-[60px] flex-1 rounded-[18px]" onClick={() => act((prev) => resolveHexCombatNegotiation(prev, 'reject'))}>Reject</SecondaryButton>
          <PrimaryButton className="flex-1" tone="exit" onClick={() => act((prev) => resolveHexCombatNegotiation(prev, 'accept'))}>{combat.negotiation.side === 'enemy' ? 'Accept' : 'Pay'}</PrimaryButton>
        </div>
      </div>
    )
  } else if (showSummary) {
    panel = (
      <div className="flex flex-col gap-3">
        {summaryList}
        <PrimaryButton onClick={() => act(acknowledgeFleetRound)}>Next round</PrimaryButton>
      </div>
    )
  } else {
    const shipSelected = selectedEntry?.kind === 'ship'
    const squadronSelected = selectedEntry?.kind === 'squadron' && selectedEntry.side === 'player'
    panel = (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Your fleet">
          <button type="button" role="radio" aria-checked={shipSelected} onClick={() => act((prev) => selectFleetUnit(prev, prev.combat.playerShipUnit.id))} className={`flex min-h-[76px] flex-col justify-between gap-1 rounded-[18px] border-2 bg-panel px-3.5 py-2.5 text-left ${shipSelected ? 'border-accent' : 'border-transparent'}`}>
            <span className="flex items-baseline justify-between gap-2"><span className="truncate font-display text-[16px] font-semibold">{run.shipName}</span><span className="font-num text-[14px] text-soft">{run.player.hull}/{run.player.hullMax}</span></span>
            <span className={`text-[13px] ${shipOrder ? 'text-accent' : 'text-mute'}`}>{shipOrder ? 'Move set' : combat.playerShipUnit.actionsRemaining > 0 ? 'Tap a circle to move' : 'Engines spent'} · shields {run.player.shields}</span>
            <span className="h-1 overflow-hidden rounded-full bg-ink/15"><span className="block h-full rounded-full bg-ink" style={{ width: `${(run.player.hull / Math.max(1, run.player.hullMax)) * 100}%` }} /></span>
          </button>
          {playerSquadron ? (
            <button type="button" role="radio" aria-checked={squadronSelected} onClick={() => act((prev) => selectFleetUnit(prev, playerSquadron.id))} className={`flex min-h-[76px] flex-col justify-between gap-1 rounded-[18px] border-2 bg-panel px-3.5 py-2.5 text-left ${squadronSelected ? 'border-accent' : 'border-transparent'}`}>
              <span className="flex items-baseline justify-between gap-2"><span className="font-display text-[16px] font-semibold">Drones</span><span className="font-num text-[14px] text-soft">{squadronAliveCount(playerSquadron)}/{DRONE_SQUADRON_SIZE}</span></span>
              <span className={`text-[13px] ${squadronOrder?.move ? 'text-accent' : 'text-mute'}`}>{playerSquadron.launchedTurn === combat.turnNumber ? 'Launching this round' : squadronOrder?.move ? 'Move set' : 'Tap a hex to move'}</span>
              <span className="h-1 overflow-hidden rounded-full bg-ink/15"><span className="block h-full rounded-full bg-ink" style={{ width: `${(squadronAliveCount(playerSquadron) / DRONE_SQUADRON_SIZE) * 100}%` }} /></span>
            </button>
          ) : (
            <button type="button" disabled={(combat.droneBayCooldown || 0) > 0} onClick={() => act(launchHexCombatSquadron)} className="flex min-h-[76px] flex-col justify-center gap-1 rounded-[18px] border-2 border-dashed border-accent/50 px-3.5 text-left text-accent disabled:border-line disabled:text-mute">
              <span className="font-display text-[16px] font-semibold">Launch drones</span>
              <span className="text-[13px] text-mute">{(combat.droneBayCooldown || 0) > 0 ? `Bay ready in ${combat.droneBayCooldown}` : `${DRONE_SQUADRON_SIZE} drones ready`}</span>
            </button>
          )}
        </div>
        {shipSelected ? (
          <>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, run.player.weaponSlots.filter(Boolean).length)}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Weapons">
              {run.player.weaponSlots.map((weapon, index) => {
                if (!weapon) return null
                const blocked = weaponStateLabel(run, weapon)
                const target = findCombatUnit(run, fleetWeaponTarget(run, weapon))
                const aimText = !target ? 'No target' : target.kind === 'ship' ? FLEET_SYSTEM_LABELS[weapon.targetId] || 'Hull' : 'Drones'
                return (
                  <button key={weapon.instanceId} type="button" role="radio" aria-checked={index === weaponIndex} onClick={() => act((prev) => selectFleetWeapon(prev, index))} className={`flex min-h-[52px] flex-col justify-center rounded-[14px] border-2 bg-panel px-2.5 text-left ${index === weaponIndex ? 'border-accent' : 'border-transparent'}`}>
                    <span className="truncate text-[14px] font-semibold">{weaponShortName(weapon)}</span>
                    <span className={`truncate text-[12px] ${blocked ? 'text-fuel' : 'text-mute'}`}>{blocked || `→ ${aimText}`}</span>
                  </button>
                )
              })}
            </div>
            {selectedWeapon && weaponTargetEntry?.kind === 'ship' ? (
              <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Enemy system">
                {FLEET_SYSTEM_IDS.map((systemId) => {
                  const active = (selectedWeapon.targetId || 'hull') === systemId
                  return (
                    <button key={systemId} type="button" role="radio" aria-checked={active} onClick={() => act((prev) => aimFleetWeapon(prev, weaponIndex, weaponTargetEntry.unit.id, systemId))} className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-[12px] border-2 px-1 ${active ? 'border-hostile bg-hostile/15' : 'border-transparent bg-panel'}`}>
                      <Icon name={{ hull: 'ship', weapons: 'target', shields: 'shield', engines: 'engine', crew: 'crew' }[systemId]} size={18} />
                      <span className="text-[12px] font-semibold">{FLEET_SYSTEM_LABELS[systemId]}</span>
                      <span className="text-center text-[10px] leading-tight text-mute">{status[systemId]}</span>
                    </button>
                  )
                })}
              </div>
            ) : selectedWeapon ? <div className="text-[14px] text-mute">Aimed at their drones. Tap their ship to aim at a system.</div> : null}
          </>
        ) : null}
        {squadronSelected ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Drone target">
              {enemyUnits.map((unit) => {
                const active = fleetSquadronTarget(run, selectedEntry.unit) === unit.id
                return <button key={unit.id} type="button" role="radio" aria-checked={active} onClick={() => act((prev) => aimFleetSquadron(prev, selectedEntry.unit.id, unit.id))} className={`flex min-h-[48px] items-center justify-center rounded-[14px] border-2 px-2 text-[14px] font-semibold ${active ? 'border-hostile bg-hostile/15' : 'border-transparent bg-panel'}`}>{unit.kind === 'ship' ? unit.name : 'Their drones'}</button>
              })}
            </div>
            <div className="text-[13px] text-mute">Drones strike only when they end the move next to their target.</div>
          </div>
        ) : null}
        <PrimaryButton onClick={() => act(resolveFleetRound)}>Execute</PrimaryButton>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2"><span className="truncate font-display text-[16px] font-semibold text-hostile-soft">{enemy.name}</span><span className="font-num text-[15px] font-bold">{Math.round(enemy.hull)}/{enemy.hullMax}</span></div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-hostile/20"><span className="block h-full rounded-full bg-hostile" style={{ width: `${(enemy.hull / Math.max(1, enemy.hullMax)) * 100}%` }} /></span>
            {Array.from({ length: enemyLayers }, (_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < enemyCharged ? 'bg-hostile-soft' : 'border border-hostile-soft/50'}`} />)}
          </div>
        </div>
        <div className="flex h-9 items-center rounded-[12px] bg-panel px-3 font-num text-[14px] font-bold tracking-[0.08em] text-soft">ROUND {combat.turnNumber}</div>
        <IconButton icon="more" label="Battle options" onClick={() => setMenuOpen(true)} />
      </div>
      <div className="min-h-0 flex-1 px-2 py-1">
        <FleetArena
          run={run}
          now={now}
          onSelectOwn={(unitId) => act((prev) => selectFleetUnit(prev, unitId))}
          onTapEnemy={tapEnemy}
          onPlanShip={(option) => act((prev) => (prev.combat.orders?.[prev.combat.playerShipUnit.id]?.move?.col === option.col && prev.combat.orders?.[prev.combat.playerShipUnit.id]?.move?.row === option.row ? clearFleetMove(prev, prev.combat.playerShipUnit.id) : planFleetShipMove(prev, option)))}
          onPlanSquadron={(squadronId, hex) => act((prev) => (hexEquals(prev.combat.orders?.[squadronId]?.move, hex) ? clearFleetMove(prev, squadronId) : planFleetSquadronMove(prev, squadronId, hex)))}
        />
      </div>
      <div className="px-4 pb-4 pt-1">{panel}</div>
      <Sheet open={menuOpen} title="Battle options" subtitle={`${enemy.name} · round ${combat.turnNumber}`} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-2">
          <SecondaryButton disabled={!fleetCombatActive(run)} onClick={() => { setMenuOpen(false); act(offerHexCombatSurrender) }}>Offer tribute to stop the fight</SecondaryButton>
          <SecondaryButton tone="fuel" disabled={!fleetCombatActive(run) || combat.playerShipUnit.actionsRemaining <= 0} onClick={() => { setMenuOpen(false); act(attemptHexCombatFlee) }}>Flee · {fleeChance}% chance</SecondaryButton>
          <SecondaryButton disabled={!fleetCombatActive(run)} onClick={() => { setMenuOpen(false); act(autoResolveFleetCombat) }}>Auto-resolve the battle</SecondaryButton>
          <SecondaryButton onClick={() => { setMenuOpen(false); setLogOpen(true) }}>Battle log</SecondaryButton>
          <Label className="mt-3">Test tools</Label>
          <SecondaryButton tone="fuel" onClick={() => act(devRestoreShip)}>Restore ship</SecondaryButton>
          <SecondaryButton tone="fuel" disabled={Boolean(combat.outcome)} onClick={() => { setMenuOpen(false); act(devForceCombatVictory) }}>Force combat victory</SecondaryButton>
        </div>
      </Sheet>
      <Sheet open={logOpen} title="Battle log" onClose={() => setLogOpen(false)}>
        <div className="flex flex-col gap-2">{(combat.feed || []).map((entry, index) => <div key={`${entry}_${index}`} className="rounded-[14px] bg-raised px-4 py-3 text-[15px]">{entry}</div>)}</div>
      </Sheet>
    </div>
  )
}

function ContactScreen({ run, setRun, now }) {
  const warning = run.combatWarning
  const enemy = warning.enemy
  const incomingTribute = tributeDemandCost(run)
  const canPayIncomingTribute = playerCanPayTribute(run, incomingTribute)
  const outgoingTributeText = tributeSummary(enemyTributeOffer(run))
  const canDemandTribute = enemy.kind !== 'patrol' && Boolean(outgoingTributeText)
  const act = (fn) => setRun((prev) => fn(prev))
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-4 pb-6 pt-4">
      <div className="font-num text-[13px] font-semibold uppercase tracking-[0.18em] text-hostile-soft">Contact</div>
      <h1 className="m-0 mt-1 font-display text-[30px] font-bold leading-tight">{warning.title}</h1>
      <p className="mb-0 mt-2 text-[17px] leading-relaxed text-[#C2CEDF]">{warning.description}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-[13px] text-mute">{run.shipName}</div><div className="font-num text-[24px] font-bold">{run.player.hull}<span className="text-[14px] text-mute">/{run.player.hullMax}</span></div><div className="text-[13px] text-soft">{equippedWeapons(run.player).length} weapons · shields {run.player.shields}</div></Card>
        <Card className="p-4"><div className="text-[13px] text-hostile-soft">{enemy.name}</div><div className="font-num text-[24px] font-bold">{enemy.hull}<span className="text-[14px] text-mute">/{enemy.hullMax}</span></div><div className="text-[13px] text-soft">{(enemy.weapons || []).length} weapons · shields {enemy.shields}</div></Card>
      </div>
      <div className="flex-1" />
      <div className="mt-6 flex flex-col gap-2.5">
        {(warning.demandChoices || []).map((choice) => {
          const disabled = choice.id === 'pay_tribute' ? !canPayIncomingTribute : false
          const note = choice.id === 'pay_tribute' ? `Costs ${tributeSummary(incomingTribute)}${canPayIncomingTribute ? '' : ' (you cannot cover it)'}` : choice.note
          return <ChoiceButton key={choice.id} title={choice.label} note={note} disabled={disabled} onClick={() => act((prev) => resolveCombatDemand(prev, choice.id))} />
        })}
        {canDemandTribute ? <ChoiceButton title="Demand tribute" note={`They pay ${outgoingTributeText} if they back down`} onClick={() => act(demandTributeFromEnemy)} /> : null}
        <div className="flex gap-2.5">
          <SecondaryButton className="h-[60px] flex-1 rounded-[18px]" tone="fuel" onClick={() => act(fleeCombatWarning)}>Flee · {Math.round((warning.escapeChance || 0) * 100)}%</SecondaryButton>
          <PrimaryButton className="flex-1" tone="hostile" onClick={() => act(engageCombatWarning)}>Engage</PrimaryButton>
        </div>
      </div>
    </div>
  )
}

function EndScreen({ kind, run, onNewRun, onMenu }) {
  const won = kind === 'victory'
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <div className={`font-num text-[14px] font-semibold uppercase tracking-[0.2em] ${won ? 'text-exit' : 'text-hostile-soft'}`}>{won ? 'Run complete' : 'Run lost'}</div>
      <h1 className="m-0 mt-2 font-display text-[36px] font-bold">{won ? 'Ten systems crossed' : `${run.shipName} is gone`}</h1>
      <p className="text-[17px] text-soft">{won ? `${run.shipName} reached the end of the line in ${run.turn} turns.` : `Lost in system ${run.systemIndex} of ${MASTER.maxSystems}, turn ${run.turn}.`}</p>
      <PrimaryButton className="mt-6 w-full" onClick={onNewRun}>New run</PrimaryButton>
      {onMenu ? <button type="button" onClick={onMenu} className="mt-2 h-11 text-[15px] font-semibold text-mute">Back to start</button> : null}
    </div>
  )
}

const HULL_TAGLINES = {
  Scout: 'Fast, quiet, fragile',
  Cargo: 'Deep holds, slow turns',
  Battleship: 'Heavy hull, loud signature',
}

function LaunchScreen({ setup, setSetup, onStart, onContinue, hasSave }) {
  const [editingNames, setEditingNames] = useState(false)
  const classes = Object.keys(SHIP_PRESETS)
  const index = Math.max(0, classes.indexOf(setup.shipClass))
  const preset = SHIP_PRESETS[classes[index]]
  const pickClass = (shipClass) => setSetup((prev) => {
    const nextDefaultName = SHIP_NAME_DEFAULTS[shipClass] || shipClass
    const previousDefaultName = SHIP_NAME_DEFAULTS[prev.shipClass] || prev.shipClass
    const keepCustomName = String(prev.shipName || '').trim() && sanitizeName(prev.shipName, previousDefaultName) !== previousDefaultName
    return sanitizeSetupPrefs({ ...prev, shipClass, shipName: keepCustomName ? prev.shipName : nextDefaultName })
  })
  const step = (delta) => pickClass(classes[(index + delta + classes.length) % classes.length])
  const shipName = sanitizeName(setup.shipName, SHIP_NAME_DEFAULTS[setup.shipClass] || setup.shipClass)
  const aiName = sanitizeName(setup.playerName, DEFAULT_PLAYER_NAME)
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-6 pt-4">
      <div className="font-display text-[26px] font-bold tracking-[0.14em]">STL</div>
      <div className="mt-12 text-center">
        <h1 className="m-0 font-display text-[40px] font-bold uppercase tracking-[0.12em]">{classes[index]}</h1>
        <div className="mt-1 text-[16px] text-soft">{HULL_TAGLINES[classes[index]]}</div>
      </div>
      <div className="relative mt-6 flex h-[200px] items-center justify-between">
        <button type="button" aria-label="Previous hull" onClick={() => step(-1)} className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-panel"><Icon name="left" /></button>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg width="300" height="70" viewBox="0 0 300 70" className="absolute bottom-2" aria-hidden="true"><ellipse cx="150" cy="35" rx="120" ry="20" fill="#46E0FF" fillOpacity="0.07" stroke="#46E0FF" strokeOpacity="0.35" /></svg>
          <ShipSilhouette shipClass={classes[index]} width={240} />
        </div>
        <button type="button" aria-label="Next hull" onClick={() => step(1)} className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-panel"><Icon name="right" /></button>
      </div>
      <div className="mt-2 flex justify-center gap-2" aria-hidden="true">
        {classes.map((shipClass, dotIndex) => <span key={shipClass} className={`h-1.5 rounded-full ${dotIndex === index ? 'w-6 bg-accent' : 'w-1.5 bg-ink/25'}`} />)}
      </div>
      <div className="mt-8 grid grid-cols-3 text-center">
        {[['Hull', preset.hullMax], ['Speed', preset.speed], ['Cargo', preset.cargoCapacity]].map(([label, value]) => (
          <div key={label} className="flex flex-col"><span className="font-num text-[30px] font-bold">{value}</span><span className="text-[13px] text-mute">{label}</span></div>
        ))}
      </div>
      <div className="flex-1" />
      {editingNames ? (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-mute">Ship name
            <input className="h-12 rounded-[14px] bg-panel px-3 text-[16px] text-ink outline-none focus:ring-2 focus:ring-accent" value={setup.shipName} maxLength={24} onChange={(event) => setSetup((prev) => ({ ...prev, shipName: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-mute">AI name
            <input className="h-12 rounded-[14px] bg-panel px-3 text-[16px] text-ink outline-none focus:ring-2 focus:ring-accent" value={setup.playerName} maxLength={24} onChange={(event) => setSetup((prev) => ({ ...prev, playerName: event.target.value }))} />
          </label>
        </div>
      ) : (
        <button type="button" onClick={() => setEditingNames(true)} className="mx-auto mb-2 flex h-11 items-center gap-2 rounded-[14px] px-4 text-[15px] text-soft">{shipName} · AI {aiName}<Icon name="pencil" size={16} /></button>
      )}
      <PrimaryButton onClick={onStart}>Launch</PrimaryButton>
      {hasSave ? <button type="button" onClick={onContinue} className="mt-2 h-11 rounded-[14px] text-[15px] font-semibold text-mute">Continue saved run</button> : null}
    </div>
  )
}

export default function STLSynthesisedGame() {
  const [run, setRun] = useState(null)
  const [setup, setSetup] = useState(defaultSetupPrefs())
  const [now, setNow] = useState(Date.now())
  const [hoveredCombatUnitId, setHoveredCombatUnitId] = useState(null)
  const mapFrameRef = useRef(null)
  const [toast, setToast] = useState(null)
  const lastLogKeyRef = useRef(null)
  const mapGestureRef = useRef({ mode: null, moved: false, startScale: 1, startCenter: { x: 180, y: 180 }, startTouch: { x: 0, y: 0 }, startDistance: 0, startMidpoint: { x: 0, y: 0 } })

  useEffect(() => {
    try {
      const savedSetup = localStorage.getItem(MASTER.setupKey)
      if (savedSetup) setSetup(sanitizeSetupPrefs(JSON.parse(savedSetup)))
    } catch {
      localStorage.removeItem(MASTER.setupKey)
    }
    try {
      const saved = localStorage.getItem(MASTER.saveKey)
      if (!saved) return
      const restored = normalizeRun(JSON.parse(saved))
      if (restored) {
        setRun(restored)
        setSetup(setupFromRun(restored))
      }
      else localStorage.removeItem(MASTER.saveKey)
    } catch {
      localStorage.removeItem(MASTER.saveKey)
    }
  }, [])

  useEffect(() => {
    const head = run?.log?.[0]
    const key = head ? `${run.log.length}|${head}` : null
    if (!key) return undefined
    if (lastLogKeyRef.current === null || run.screen !== 'map') {
      lastLogKeyRef.current = key
      return undefined
    }
    if (key === lastLogKeyRef.current) return undefined
    lastLogKeyRef.current = key
    setToast(rawLogText(head))
    const id = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(id)
  }, [run?.log?.length, run?.log?.[0], run?.screen])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 33)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MASTER.setupKey, JSON.stringify(sanitizeSetupPrefs(setup)))
    } catch {
      // ignore storage errors
    }
  }, [setup])

  useEffect(() => {
    if (!run) return
    try {
      localStorage.setItem(MASTER.saveKey, JSON.stringify(run))
    } catch {
      // ignore storage errors
    }
  }, [run])

  useEffect(() => {
    if (!run) return
    const nextSetup = setupFromRun(run)
    setSetup((prev) => (sameSetupPrefs(prev, nextSetup) ? prev : nextSetup))
  }, [run?.player?.shipClass, run?.shipName, run?.playerName])

  useEffect(() => {
    if (!run?.ui?.travelAnimation) return undefined
    const id = window.setTimeout(() => setRun((prev) => finalizeTravelAnimation(prev)), run.ui.travelAnimation.durationMs)
    return () => window.clearTimeout(id)
  }, [run?.ui?.travelAnimation])

  useEffect(() => {
    if (run?.screen === 'combat_hex' && hoveredCombatUnitId && isCombatUnitAlive(run, hoveredCombatUnitId)) return
    if (hoveredCombatUnitId) setHoveredCombatUnitId(null)
  }, [run?.screen, run?.combat, hoveredCombatUnitId])

  useEffect(() => {
    if (!run || run.screen !== 'combat_hex' || !run.combat?.autoCombat || run.combat.outcome) return undefined
    const id = window.setTimeout(() => setRun((prev) => resolveHexCombatAutoCombatStep(prev)), 420)
    return () => window.clearTimeout(id)
  }, [run?.screen, run?.combat?.autoCombat, run?.combat?.turnNumber, run?.combat?.outcome, run?.combat?.negotiation, run?.combat?.selectedUnitId, run?.combat?.playerShipUnit?.actionsRemaining, run?.combat?.enemyShipUnit?.actionsRemaining])

  useEffect(() => {
    if (!run || run.screen !== 'combat' || !run.combat || run.combat.speed <= 0 || run.combat.outcome) return undefined
    const id = window.setInterval(() => setRun((prev) => tickCombat(prev)), 360)
    return () => window.clearInterval(id)
  }, [run?.screen, run?.combat?.speed, run?.combat?.outcome])

  const selectedNode = useMemo(() => (run ? findNode(run.system, run.selectedNodeId) : null), [run])
  const cargoEntries = useMemo(() => (run ? buildCargoGridEntries(run) : []), [run])
  const selectedCargoEntry = useMemo(() => cargoEntries.find((entry) => entry.key === run?.ui?.selectedCargoItemId) || null, [cargoEntries, run?.ui?.selectedCargoItemId])
  const selectedWeaponSlot = useMemo(() => (run && Number.isInteger(run.ui?.selectedWeaponSlotIndex) ? run.player.weaponSlots?.[run.ui.selectedWeaponSlotIndex] || null : null), [run])
  const reachableIds = useMemo(() => (run ? getReachableNodeIds(run) : new Set()), [run])
  const animatedSystem = useMemo(() => {
    if (!run) return null
    if (!run.ui?.travelAnimation) return run.system
    const anim = run.ui.travelAnimation
    const travelProgress = clamp((now - anim.startAt) / anim.durationMs, 0, 1)
    const base = deepClone(run.system)
    base.orbitOffsets = base.orbitOffsets.map((offset, orbit) => {
      const turnDelta = anim.toOffsets[orbit] - anim.fromOffsets[orbit]
      return offset + turnDelta * travelProgress
    })
    return base
  }, [run, now])

  const applyPanDelta = (dx, dy, scale, startCenter, rectWidth) => {
    setRun((prev) => {
      if (!prev) return prev
      const next = deepClone(prev)
      next.ui.mapScale = scale
      const size = 360 / next.ui.mapScale
      const unitsPerPx = size / Math.max(1, rectWidth)
      next.ui.mapCenter.x = clamp(startCenter.x - dx * unitsPerPx, size / 2, 360 - size / 2)
      next.ui.mapCenter.y = clamp(startCenter.y - dy * unitsPerPx, size / 2, 360 - size / 2)
      return next
    })
  }

  const handleMapTouchStart = (event) => {
    if (!run || run.ui.view !== 'map' || run.ui.travelAnimation || run.pendingEvent) return
    const gesture = mapGestureRef.current
    gesture.moved = false
    gesture.startScale = run.ui.mapScale
    gesture.startCenter = { ...run.ui.mapCenter }
    if (event.touches.length === 1) {
      gesture.mode = 'pan'
      gesture.startTouch = touchPoint(event.touches[0])
    } else if (event.touches.length >= 2) {
      gesture.mode = 'pinch'
      gesture.startDistance = Math.max(1, touchDistance(event.touches[0], event.touches[1]))
      gesture.startMidpoint = getTouchMidpoint(event.touches[0], event.touches[1])
    }
  }

  const handleMapTouchMove = (event) => {
    if (!run || run.ui.view !== 'map' || run.ui.travelAnimation || run.pendingEvent) return
    const frame = mapFrameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    const gesture = mapGestureRef.current
    if (gesture.mode === 'pan' && event.touches.length === 1) {
      event.preventDefault()
      const currentTouch = touchPoint(event.touches[0])
      const dx = currentTouch.x - gesture.startTouch.x
      const dy = currentTouch.y - gesture.startTouch.y
      const visibleSize = 360 / gesture.startScale
      const unitsPerPx = visibleSize / Math.max(1, rect.width)
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) gesture.moved = true
      applyPanDelta(dx, dy, gesture.startScale, gesture.startCenter, rect.width)
      return
    }
    if (event.touches.length >= 2) {
      event.preventDefault()
      const newDistance = Math.max(1, touchDistance(event.touches[0], event.touches[1]))
      const ratio = newDistance / Math.max(1, gesture.startDistance)
      const midpoint = getTouchMidpoint(event.touches[0], event.touches[1])
      const midDx = midpoint.x - gesture.startMidpoint.x
      const midDy = midpoint.y - gesture.startMidpoint.y
      const newScale = clamp(Number((gesture.startScale * ratio).toFixed(2)), 1, 4)
      gesture.mode = 'pinch'
      gesture.moved = true
      applyPanDelta(midDx, midDy, newScale, gesture.startCenter, rect.width)
    }
  }

  const handleMapTouchEnd = (event) => {
    if (!run || run.ui.view !== 'map' || run.ui.travelAnimation || run.pendingEvent) return
    const gesture = mapGestureRef.current
    if (event.touches.length === 0) {
      gesture.mode = null
      return
    }
    if (event.touches.length === 1) {
      gesture.mode = 'pan'
      gesture.startTouch = touchPoint(event.touches[0])
      gesture.startCenter = { ...run.ui.mapCenter }
      gesture.startScale = run.ui.mapScale
      return
    }
    if (event.touches.length >= 2) {
      gesture.mode = 'pinch'
      gesture.startDistance = Math.max(1, touchDistance(event.touches[0], event.touches[1]))
      gesture.startMidpoint = getTouchMidpoint(event.touches[0], event.touches[1])
      gesture.startCenter = { ...run.ui.mapCenter }
      gesture.startScale = run.ui.mapScale
    }
  }

  const handleMapMouseDown = (event) => {
    if (!run || run.ui.view !== 'map' || run.ui.travelAnimation || run.pendingEvent) return
    if (event.button !== 0) return
    const gesture = mapGestureRef.current
    gesture.mode = 'mouse-pan'
    gesture.moved = false
    gesture.startScale = run.ui.mapScale
    gesture.startCenter = { ...run.ui.mapCenter }
    gesture.startTouch = { x: event.clientX, y: event.clientY }
  }

  const handleMapMouseMove = (event) => {
    if (!run || mapGestureRef.current.mode !== 'mouse-pan') return
    const frame = mapFrameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    const gesture = mapGestureRef.current
    const dx = event.clientX - gesture.startTouch.x
    const dy = event.clientY - gesture.startTouch.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) gesture.moved = true
    applyPanDelta(dx, dy, gesture.startScale, gesture.startCenter, rect.width)
  }

  const handleMapMouseUp = () => {
    if (mapGestureRef.current.mode === 'mouse-pan') mapGestureRef.current.mode = null
  }

  const handleMapWheel = (event) => {
    if (!run || run.ui.view !== 'map' || run.ui.travelAnimation) return
    setRun((prev) => zoomMap(prev, event.deltaY < 0 ? 0.25 : -0.25))
  }

  const handleMapClick = () => {
    const gesture = mapGestureRef.current
    if (gesture.moved) {
      gesture.moved = false
      return
    }
  }

  const startConfiguredRun = () => {
    const nextSetup = sanitizeSetupPrefs(setup)
    setSetup(nextSetup)
    try {
      localStorage.removeItem(MASTER.saveKey)
    } catch {
      // ignore storage errors
    }
    setRun(newRun(nextSetup))
  }

  const loadSavedRun = () => {
    try {
      const saved = localStorage.getItem(MASTER.saveKey)
      if (!saved) return
      const restored = normalizeRun(JSON.parse(saved))
      if (restored) {
        setRun(restored)
        setSetup(setupFromRun(restored))
      }
      else localStorage.removeItem(MASTER.saveKey)
    } catch {
      localStorage.removeItem(MASTER.saveKey)
    }
  }

  if (!run) {
    let hasSave = false
    try {
      hasSave = Boolean(localStorage.getItem(MASTER.saveKey))
    } catch {
      hasSave = false
    }
    return <LaunchScreen setup={setup} setSetup={setSetup} onStart={startConfiguredRun} onContinue={loadSavedRun} hasSave={hasSave} />
  }

  if (run.screen === 'victory' || run.screen === 'gameover') {
    return <EndScreen kind={run.screen} run={run} onNewRun={() => { try { localStorage.removeItem(MASTER.saveKey) } catch { /* storage unavailable */ } setRun(null) }} onMenu={run.screen === 'victory' ? () => setRun(null) : null} />
  }

  if (run.screen === 'combat_warning' && run.combatWarning) {
    return <ContactScreen run={run} setRun={setRun} now={now} />
  }

  if (run.screen === 'combat_hex' && run.combat) {
    return <FleetCombatScreen run={run} setRun={setRun} now={now} />
  }

  if (run.screen === 'combat' && run.combat) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-3">
        <RunMenu run={run} setRun={setRun} />
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="rounded-3xl border border-amber-700 bg-slate-900 p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-amber-300">Combat terminal</div>
                  <div className="mt-1 text-xl font-bold">{run.combat.enemy.name}</div>
                  <div className="text-sm text-slate-400">{run.combat.enemy.kind === 'patrol' ? 'Police interdiction' : 'Pirate ambush'} {run.combat.outcome ? 'resolved' : 'in progress'}</div>
                </div>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'Pause' },
                    { value: 2, label: '2x' },
                    { value: 4, label: '4x' },
                    { value: 6, label: '6x' },
                  ].map((speed) => (
                    <button
                      key={speed.value}
                      className={`rounded-xl px-3 py-2 text-xs ${run.combat.speed === speed.value ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
                      onClick={() => setRun((prev) => ({ ...prev, combat: { ...prev.combat, speed: speed.value } }))}
                    >
                      {speed.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <CombatScene player={run.player} enemy={run.combat.enemy} shots={run.combat.shots} now={now} playerLabel={run.shipName} />
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <EntityStatusPanel title={run.shipName} entity={run.player} systems={run.combat.playerSystems} accent="cyan" stats={[{ label: 'Dodge', value: `${Math.round(dodgeChance(effectiveCombatManeuverability(run.player, run.combat.playerSystems, pilotManeuverBonus(run))) * 100)}%`, tone: 'cyan' }, { label: 'Speed', value: playerSpeedValue(run), tone: 'green' }, { label: 'Stealth', value: playerStealthValue(run), tone: 'green' }, { label: 'Crew', value: `${run.crew.length} aboard`, tone: 'amber' }]} toggles={[{ label: 'Auto-repair', active: run.player.autoRepair !== false, onClick: () => setRun((prev) => toggleCombatAutomation(prev, 'autoRepair')) }, { label: 'Auto-reload', active: run.player.autoReload !== false, onClick: () => setRun((prev) => toggleCombatAutomation(prev, 'autoReload')) }]} />
                <EntityStatusPanel title={run.combat.enemy.name} entity={run.combat.enemy} systems={run.combat.enemySystems} accent="rose" stats={[{ label: 'Dodge', value: `${Math.round(dodgeChance(effectiveCombatManeuverability(run.combat.enemy, run.combat.enemySystems)) * 100)}%`, tone: 'rose' }, { label: 'Speed', value: run.combat.enemy.speed, tone: 'rose' }, { label: 'Stealth', value: run.combat.enemy.stealth, tone: 'amber' }, { label: 'Threat', value: run.combat.enemy.kind === 'patrol' ? 'Police' : 'Pirate', tone: 'rose' }]} />
              </div>
              <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ship systems</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{Number.isInteger(run.ui.selectedCombatWeaponIndex) ? `Assign target for weapon #${run.ui.selectedCombatWeaponIndex + 1}` : 'Select Target on a weapon, then click a hostile system.'}</div>
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  <ShipSystemsPanel
                    title={`${run.shipName} systems`}
                    accent="cyan"
                    entity={run.player}
                    systems={run.combat.playerSystems}
                    weapons={run.player.weaponSlots}
                    crew={run.crew}
                    run={run}
                    isPlayerSide
                    combatNow={now}
                    weaponAssignments={{}}
                    incomingMarkers={{ [run.combat.enemyTarget]: ['E'] }}
                    onTogglePower={(slotIndex) => setRun((prev) => toggleCombatWeaponPower(prev, slotIndex))}
                    onToggleReload={(slotIndex) => setRun((prev) => toggleCombatWeaponReload(prev, slotIndex))}
                    onArmWeaponTarget={(slotIndex) => setRun((prev) => selectCombatWeaponTargeting(prev, slotIndex))}
                    targetingWeaponIndex={run.ui.selectedCombatWeaponIndex}
                    onToggleRepair={(instanceId) => setRun((prev) => toggleCombatRepairTarget(prev, instanceId))}
                    repairQueue={run.combat.repairQueue}
                  />
                  <ShipSystemsPanel
                    title={`${run.combat.enemy.name} systems`}
                    accent="rose"
                    entity={run.combat.enemy}
                    systems={run.combat.enemySystems}
                    weapons={run.combat.enemy.weapons}
                    crew={run.combat.enemy.crew}
                    run={run}
                    selectedTarget={run.combat.playerTarget}
                    onSelectTarget={(targetId) => setRun((prev) => setCombatTarget(prev, targetId))}
                    weaponAssignments={targetAssignmentMap(run.player.weaponSlots)}
                    combatNow={now}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Crew quarters</div>
                <div className="mt-3"><CombatCrewStrip crew={run.crew} selectedCrewId={run.ui.selectedCrewId} onSelect={(crewId) => setRun((prev) => selectCrewMember(prev, crewId))} /></div>
                <div className="mt-4 grid gap-2">
                  {run.combat.enemy.crew.map((member) => <div key={member.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{member.name}</div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{member.role}</div></div><div className="mt-2 h-2 overflow-hidden rounded-full border border-rose-900/70 bg-slate-950"><div className="h-full rounded-full bg-rose-500" style={{ width: `${((member.health || 0) / Math.max(1, member.healthMax || 1)) * 100}%` }} /></div></div>)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 content-start gap-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Combat log</div>
                <div className="mt-3 grid max-h-[360px] gap-2 overflow-auto pr-1 text-sm text-slate-300">
                  {run.combat.feed.map((entry, index) => { const meta = classifyCombatFeedEntry(entry); return <div key={`${entry}_${index}`} className={`rounded-2xl border px-3 py-2 ${meta.tone}`}><div className="flex items-start justify-between gap-3"><div className="text-sm">{entry}</div><div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{meta.badge}</div></div></div> })}
                </div>
              </div>

              {run.combat.outcome ? (
                <div className="rounded-3xl border border-emerald-800 bg-emerald-950/20 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Victory</div>
                  <div className="mt-2 text-lg font-semibold">{run.combat.outcome.title}</div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-200">
                      {Object.entries(run.combat.outcome.reward || {}).map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-emerald-900/60 bg-slate-950/40 px-3 py-2">{outcomeDelta(key, value)}</div>
                      ))}
                    </div>
                  <div className="mt-4">
                    <ActionButton tone="green" onClick={() => setRun((prev) => continueAfterCombat(prev))}>Continue</ActionButton>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const current = findNode(run.system, run.currentNodeId)
  const systemViewBox = getMapViewBox(run.ui)
  const view = run.ui.view === 'map' ? 'map' : 'ship'
  const sheet = run.ui.sheet || null
  const selectedNpc = findNpcShip(run.system, run.ui.selectedNpcId) || null
  const selectedNpcHere = selectedNpc ? selectedNpc.currentNodeId === current.id : false
  const isHereSelected = !selectedNode || selectedNode.id === current.id
  const selectedReachable = selectedNode ? reachableIds.has(selectedNode.id) : false
  const meteorPath = run.system.meteorPath
  const meteorRideAvailable = Boolean(meteorPath && selectedNode && !isHereSelected && nodeOnMeteorPath(run.system, current, meteorPath) && nodeOnMeteorPath(run.system, selectedNode, meteorPath))
  const travelMode = meteorRideAvailable ? 'meteor' : isHereSelected ? 'wait' : 'travel'
  const jumpFuel = isHereSelected ? 0 : fuelCostForDistance(run, nodeDistance(run.system, current, selectedNode), travelMode)
  const routeRisk = securityRiskForRoute(run, selectedNode || current, travelMode)
  const dockedAtCardinalBase = isDockedAtCardinalBase(current)
  const merchantSource = run.ui.merchantContext ? merchantSourceById(run.system, run.ui.merchantContext.id) : null
  const tradeOpen = Boolean(run.ui.merchantOpen && merchantSource)
  const advancementPrompt = run.screen === 'map' ? currentPendingAdvancement(run) : null
  const advancementCrew = advancementPrompt ? run.crew.find((member) => member.id === advancementPrompt.crewId) || null : null
  const pendingEvent = run.pendingEvent
  const eventOutcome = run.ui.eventOutcome
  const travelling = Boolean(run.ui.travelAnimation)
  const localLabel = localActionLabel(current)
  const ghostPos = (() => {
    if (!selectedNode || isHereSelected || travelling) return null
    const ghostSystem = { ...run.system, orbitOffsets: nextOrbitOffsets(run.system, false) }
    return nodePosition(ghostSystem, selectedNode)
  })()

  const shipAnimationPos = (() => {
    if (!run.ui.travelAnimation) return nodePosition(animatedSystem || run.system, current)
    const anim = run.ui.travelAnimation
    if (anim.mode === 'wait') return nodePosition(animatedSystem || run.system, current)
    const fromPos = nodePosition(animatedSystem || run.system, findNode(run.system, anim.fromNodeId))
    const toPos = nodePosition(animatedSystem || run.system, findNode(run.system, anim.toNodeId))
    const progress = clamp((now - anim.startAt) / anim.durationMs, 0, 1)
    return { x: fromPos.x + (toPos.x - fromPos.x) * progress, y: fromPos.y + (toPos.y - fromPos.y) * progress }
  })()

  const patchUi = (patch) => setRun((prev) => ({ ...prev, ui: { ...prev.ui, ...patch } }))
  const openSheet = (name) => patchUi({ sheet: name })
  const closeSheet = () => patchUi({ sheet: null })
  const openCrew = (crewId) => setRun((prev) => ({ ...prev, ui: { ...prev.ui, sheet: 'crew', selectedCrewId: crewId || prev.ui.selectedCrewId } }))
  const selectWaypoint = (nodeId) => setRun((prev) => ({ ...prev, selectedNodeId: nodeId, ui: { ...prev.ui, selectedNpcId: null } }))
  const waitTurn = () => setRun((prev) => startTravelAnimation(prev, prev.currentNodeId, 'wait'))
  const jump = () => setRun((prev) => startTravelAnimation(prev, selectedNode.id, meteorRideAvailable ? 'meteor' : 'normal'))
  const mapHandlers = { touchStart: handleMapTouchStart, touchMove: handleMapTouchMove, touchEnd: handleMapTouchEnd, mouseDown: handleMapMouseDown, mouseMove: handleMapMouseMove, mouseUp: handleMapMouseUp, wheel: handleMapWheel }

  const sheets = (
    <>
      <Sheet open={tradeOpen} title={merchantSource?.entity?.name || merchantSource?.entity?.label || 'Merchant'} subtitle={merchantSource?.type === 'npc' ? 'Shipboard exchange' : 'Merchant exchange'} onClose={() => setRun((prev) => setMerchantOpen(prev, false))}>
        <TradeSheetContent run={run} setRun={setRun} merchantSource={merchantSource} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'here'} title={nodeTitle(current)} subtitle={KIND_META[current.kind]?.label} onClose={closeSheet}>
        <HereSheetContent run={run} setRun={setRun} current={current} closeSheet={closeSheet} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'loadout'} title={run.shipName} subtitle={`${run.player.shipClass} · AI ${run.playerName}`} onClose={closeSheet}>
        <LoadoutSheetContent run={run} setRun={setRun} cargoEntries={cargoEntries} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'crew'} title="Crew" subtitle={`${run.crew.length} of ${run.player.crewCapacity} berths`} onClose={closeSheet}>
        <CrewSheetContent run={run} setRun={setRun} dockedAtCardinalBase={dockedAtCardinalBase} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'log'} title="Ship log" subtitle={`Turn ${run.turn}`} onClose={closeSheet}>
        <LogSheetContent run={run} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'legend'} title="Map legend" onClose={closeSheet}>
        <LegendSheetContent run={run} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'info'} title={nodeTitle(selectedNode || current)} subtitle={KIND_META[(selectedNode || current).kind]?.label} onClose={closeSheet}>
        <InfoSheetContent run={run} node={selectedNode || current} current={current} risk={routeRisk} travelMode={travelMode} />
      </Sheet>
      <Sheet open={!tradeOpen && sheet === 'menu'} title="Menu" onClose={closeSheet}>
        <MenuSheetContent run={run} setRun={setRun} onOpen={openSheet} />
      </Sheet>
    </>
  )

  const overlays = advancementPrompt && advancementCrew
    ? <AdvancementOverlay crewMember={advancementCrew} level={advancementPrompt.level} onChoose={(skillId, perkId) => setRun((prev) => resolveCrewAdvancement(prev, skillId, perkId))} />
    : eventOutcome
      ? <OutcomeOverlay outcome={eventOutcome} onClose={() => setRun((prev) => dismissEventOutcome(prev))} />
      : pendingEvent
        ? <EventOverlay event={pendingEvent} onChoose={(choiceId) => setRun((prev) => resolvePendingEvent(prev, choiceId))} />
        : null

  if (view === 'ship') {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-4 pb-5 pt-4">
        <div className="flex items-start gap-3">
          <div className="grid flex-1 grid-cols-3 gap-4">
            <Meter label="Hull" value={run.player.hull} max={run.player.hullMax} />
            <Meter label="Shields" value={run.player.shields} max={run.player.shieldsMax} tone="accent" />
            <Meter label="Fuel" value={run.resources.fuel} max={run.player.fuelCapacity} tone="fuel" />
          </div>
          <IconButton icon="more" label="Menu" onClick={() => openSheet('menu')} />
        </div>
        <div className="mt-3 text-center text-[14px] text-mute">{run.resources.scrap} scrap · {run.resources.parts} parts · {run.resources.credits} credits · {run.resources.kinetic_ammo || 0} ammo</div>
        <div className="mt-1 text-center text-[13px] text-mute">{run.system.name} · system {run.systemIndex} of {MASTER.maxSystems} · turn {run.turn}</div>
        <div className="mt-4"><ShipTopDown run={run} onOpenLoadout={() => openSheet('loadout')} onOpenCrew={openCrew} /></div>
        <div className="mt-3 text-center text-[15px] text-soft">{dockedAtCardinalBase ? 'Docked at' : 'At'} {nodeTitle(current)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SecondaryButton onClick={() => openCrew(run.crew[0]?.id)}><Icon name="crew" size={18} />Crew</SecondaryButton>
          <SecondaryButton onClick={() => openSheet('loadout')}><Icon name="cargo" size={18} />Loadout</SecondaryButton>
          <SecondaryButton onClick={() => openSheet('log')}><Icon name="log" size={18} />Log</SecondaryButton>
        </div>
        <div className="flex-1" />
        <div className="mt-4 flex gap-2.5">
          <SecondaryButton className="h-[60px] w-[132px] flex-none rounded-[18px]" tone={localLabel ? 'fuel' : 'plain'} onClick={() => openSheet('here')}>{localLabel || 'Here'}</SecondaryButton>
          <PrimaryButton className="flex-1" onClick={() => patchUi({ view: 'map' })}>Jump</PrimaryButton>
        </div>
        {sheets}
        {overlays}
        <Toast message={toast} />
      </div>
    )
  }

  const targetNode = selectedNode && !isHereSelected ? selectedNode : null
  const riskPercent = routeRisk ? Math.round(Math.max(routeRisk.policeChance, routeRisk.pirateChance) * 100) : 0
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3">
        <IconButton icon="back" label="Back to ship" onClick={() => patchUi({ view: 'ship' })} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[18px] font-semibold">{run.system.name}</div>
          <div className="text-[13px] text-mute">System {run.systemIndex} of {MASTER.maxSystems} · turn {run.turn}</div>
        </div>
        <div className="flex h-9 items-center rounded-[12px] bg-fuel/15 px-3 font-num text-[17px] font-bold text-fuel">{totalFuelAvailable(run)} fuel</div>
        <IconButton icon="more" label="Menu" onClick={() => openSheet('menu')} />
      </div>
      <div className="relative mt-2">
        <SystemMap run={run} animatedSystem={animatedSystem} reachableIds={reachableIds} selectedNode={selectedNode} current={current} shipAnimationPos={shipAnimationPos} ghostPos={ghostPos} viewBox={systemViewBox} mapFrameRef={mapFrameRef} gestureRef={mapGestureRef} handlers={mapHandlers} onSelectNode={selectWaypoint} onSelectNpc={(npcId) => setRun((prev) => selectNpcShip(prev, npcId))} />
        <div className="absolute right-3 top-2 flex flex-col overflow-hidden rounded-[14px] bg-panel/90">
          <button type="button" aria-label="Zoom in" onClick={() => setRun((prev) => zoomMap(prev, 0.35))} className="flex h-11 w-11 items-center justify-center"><Icon name="plus" size={20} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => setRun((prev) => zoomMap(prev, -0.35))} className="flex h-11 w-11 items-center justify-center"><Icon name="minus" size={20} /></button>
        </div>
      </div>
      <div className="mt-1 px-4 text-center text-[14px] text-mute">{travelling ? 'Rings turning…' : 'The rings turn after every jump. Dashed circle: where your target will be.'}</div>
      <div className="min-h-0 flex-1" />
      <div className="mx-4 mb-4 flex flex-col gap-3.5 rounded-[22px] bg-panel p-4">
        {selectedNpc ? (
          <>
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-raised" style={{ color: TONE_HEX[NPC_TONE[selectedNpc.kind] || 'neutral'] }}><Icon name={selectedNpc.kind === 'merchant' ? 'trade' : selectedNpc.kind === 'civilian' ? 'ship' : 'attack'} size={26} /></span>
              <div className="min-w-0 flex-1"><div className="truncate font-display text-[18px] font-semibold">{selectedNpc.name}</div><div className="text-[14px] text-soft">{CONTACT_SHIP_META[selectedNpc.kind].label} · {selectedNpcHere ? 'here with you' : 'elsewhere in the system'}</div></div>
              <IconButton icon="close" label="Deselect ship" className="bg-raised" onClick={() => setRun((prev) => selectNpcShip(prev, null))} />
            </div>
            <div className="flex gap-2.5">
              <SecondaryButton className="h-[60px] flex-1 rounded-[18px]" disabled={!selectedNpcHere || travelling} onClick={() => setRun((prev) => hailNpcShip(prev, selectedNpc.id))}>Hail</SecondaryButton>
              <PrimaryButton className="flex-1" tone="hostile" disabled={!selectedNpcHere || travelling} onClick={() => setRun((prev) => attackNpcShip(prev, selectedNpc.id, `Attacked ${selectedNpc.name} from open space.`))}>Attack</PrimaryButton>
            </div>
            {!selectedNpcHere ? <div className="-mt-1 text-center text-[13px] text-mute">Share its waypoint to hail or attack.</div> : null}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-raised" style={{ color: TONE_HEX[nodeTone(nodeDisplayKind(targetNode || current))] === TONE_HEX.mute ? '#C9D3E0' : TONE_HEX[nodeTone(nodeDisplayKind(targetNode || current))] }}><Icon name={KIND_ICON[nodeDisplayKind(targetNode || current)] || 'info'} size={26} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[18px] font-semibold">{nodeTitle(targetNode || current)}</div>
                <div className="text-[14px] text-soft">{targetNode ? <>{KIND_META[targetNode.kind]?.label} · <span className="text-fuel">{jumpFuel} fuel</span>{riskPercent >= 10 ? ` · risk ${riskPercent}%` : ''}</> : 'You are here · waiting costs no fuel'}</div>
              </div>
              <IconButton icon="info" label="Details" className="bg-raised" onClick={() => openSheet('info')} />
            </div>
            <div className="flex gap-2.5">
              <button type="button" aria-label="Wait one turn (no fuel)" title="Wait one turn" disabled={travelling} onClick={waitTurn} className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-[18px] bg-raised disabled:opacity-40"><Icon name="wait" size={24} /></button>
              {targetNode ? (
                <PrimaryButton className="flex-1" disabled={travelling || (!selectedReachable && !meteorRideAvailable) || totalFuelAvailable(run) < jumpFuel} onClick={jump}>
                  {travelling ? 'Jumping…' : (!selectedReachable && !meteorRideAvailable) ? 'Out of range' : meteorRideAvailable ? `Ride stream · ${jumpFuel}` : 'Jump'}
                </PrimaryButton>
              ) : (
                <PrimaryButton className="flex-1" tone={localLabel ? 'fuel' : 'accent'} disabled={travelling} onClick={() => (localLabel ? openSheet('here') : waitTurn())}>{travelling ? 'Waiting…' : localLabel || 'Wait'}</PrimaryButton>
              )}
            </div>
          </>
        )}
      </div>
      {sheets}
      {overlays}
      <Toast message={toast} />
    </div>
  )
}
