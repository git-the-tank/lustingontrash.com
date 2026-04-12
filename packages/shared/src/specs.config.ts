// Maps every WoW class+spec combination to its WowAudit role.
// Keyed by "ClassName:SpecName" to handle ambiguous spec names
// (e.g., "Frost" is Melee for Death Knight but Ranged for Mage).

export type CharacterRole = 'Tank' | 'Heal' | 'Melee' | 'Ranged';

const SPEC_ROLES: ReadonlyMap<string, CharacterRole> = new Map([
    // Death Knight
    ['Death Knight:Blood', 'Tank'],
    ['Death Knight:Frost', 'Melee'],
    ['Death Knight:Unholy', 'Melee'],
    // Demon Hunter
    ['Demon Hunter:Havoc', 'Melee'],
    ['Demon Hunter:Vengeance', 'Tank'],
    // Druid
    ['Druid:Balance', 'Ranged'],
    ['Druid:Feral', 'Melee'],
    ['Druid:Guardian', 'Tank'],
    ['Druid:Restoration', 'Heal'],
    // Evoker
    ['Evoker:Devastation', 'Ranged'],
    ['Evoker:Preservation', 'Heal'],
    ['Evoker:Augmentation', 'Ranged'],
    // Hunter
    ['Hunter:Beast Mastery', 'Ranged'],
    ['Hunter:Marksmanship', 'Ranged'],
    ['Hunter:Survival', 'Melee'],
    // Mage
    ['Mage:Arcane', 'Ranged'],
    ['Mage:Fire', 'Ranged'],
    ['Mage:Frost', 'Ranged'],
    // Monk
    ['Monk:Brewmaster', 'Tank'],
    ['Monk:Mistweaver', 'Heal'],
    ['Monk:Windwalker', 'Melee'],
    // Paladin
    ['Paladin:Holy', 'Heal'],
    ['Paladin:Protection', 'Tank'],
    ['Paladin:Retribution', 'Melee'],
    // Priest
    ['Priest:Discipline', 'Heal'],
    ['Priest:Holy', 'Heal'],
    ['Priest:Shadow', 'Ranged'],
    // Rogue
    ['Rogue:Assassination', 'Melee'],
    ['Rogue:Outlaw', 'Melee'],
    ['Rogue:Subtlety', 'Melee'],
    // Shaman
    ['Shaman:Elemental', 'Ranged'],
    ['Shaman:Enhancement', 'Melee'],
    ['Shaman:Restoration', 'Heal'],
    // Warlock
    ['Warlock:Affliction', 'Ranged'],
    ['Warlock:Demonology', 'Ranged'],
    ['Warlock:Destruction', 'Ranged'],
    // Warrior
    ['Warrior:Arms', 'Melee'],
    ['Warrior:Fury', 'Melee'],
    ['Warrior:Protection', 'Tank'],
]);

/**
 * Returns the expected role for a given class+spec combination.
 * Returns null if the spec is unknown.
 */
export function specToRole(
    className: string,
    specName: string
): CharacterRole | null {
    return SPEC_ROLES.get(`${className}:${specName}`) ?? null;
}

const DPS_ROLES: ReadonlySet<CharacterRole> = new Set(['Melee', 'Ranged']);

/**
 * Checks whether a parse's spec matches the character's assigned role.
 * Melee and Ranged are treated as interchangeable (both are "DPS").
 * Returns true if the parse should be included in scoring.
 */
export function isRoleMatch(
    characterRole: string,
    className: string,
    bestSpec: string | null
): boolean {
    if (!bestSpec) return true; // null spec → assume match
    const specRole = specToRole(className, bestSpec);
    if (!specRole) return true; // unknown spec → assume match
    if (specRole === characterRole) return true;
    // Melee and Ranged are interchangeable for DPS players
    if (
        DPS_ROLES.has(specRole) &&
        DPS_ROLES.has(characterRole as CharacterRole)
    ) {
        return true;
    }
    return false;
}

/**
 * Normalizes WowAudit roles into ranking groups.
 * Melee + Ranged → "DPS" for role ranking purposes.
 */
export function rankingRoleGroup(role: string): string {
    if (role === 'Melee' || role === 'Ranged') return 'DPS';
    return role;
}
