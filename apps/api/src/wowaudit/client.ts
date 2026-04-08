const WOWAUDIT_BASE_URL = 'https://wowaudit.com/v1';

export interface WowauditCharacter {
    id: number;
    name: string;
    realm: string;
    class: string;
    role: 'Melee' | 'Ranged' | 'Heal' | 'Tank';
    rank: 'Main' | 'Trial' | 'Social' | 'Alt';
    status: 'tracking' | 'pending';
    note: string | null;
    blizzard_id: number;
    tracking_since: string;
}

function getApiKey(): string {
    const key = process.env.WOWAUDIT_API_KEY;
    if (!key) {
        throw new Error('WOWAUDIT_API_KEY environment variable is required');
    }
    return key;
}

export async function fetchRoster(): Promise<WowauditCharacter[]> {
    const response = await fetch(`${WOWAUDIT_BASE_URL}/characters`, {
        headers: {
            Accept: 'application/json',
            Authorization: getApiKey(),
        },
    });

    if (!response.ok) {
        throw new Error(
            `Wowaudit API error: ${response.status} ${response.statusText}`
        );
    }

    return response.json() as Promise<WowauditCharacter[]>;
}
