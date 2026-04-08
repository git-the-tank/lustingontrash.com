export const guildConfig = {
    // WCL guild ID — from https://www.warcraftlogs.com/guild/id/693200
    wclGuildId: 693200,

    // Display info (populated on first sync, but good to have as reference)
    name: 'Lusting on Trash',
    server: 'Area 52',
    region: 'us',

    // Only sync characters with these guild ranks (0 = GM, 1 = Officer, etc.)
    // Leave empty to sync all members
    // 1 = GM, 2 = Officer, 4 = Proven Raider, 5 = Raider, 6 = Trial
    rankFilter: [1, 2, 4, 5, 6] as number[],
};
