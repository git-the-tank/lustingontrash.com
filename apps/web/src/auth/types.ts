export interface UserCharacter {
    id: string;
    name: string;
    server: string;
    className: string;
    role: string;
    rank: string;
}

export interface User {
    id: string;
    battletag: string;
    role: 'MEMBER' | 'ADMIN';
    guildRank: number | null;
    characters: UserCharacter[];
}
