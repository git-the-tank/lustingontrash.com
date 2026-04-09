export const guildConfig = {
    // WCL guild ID — from https://www.warcraftlogs.com/guild/id/693200
    wclGuildId: 693200,

    // Display info
    name: 'Lusting on Trash',
    server: 'Area 52',
    region: 'us',

    // Battle.net API uses hyphenated lowercase realm names
    realmSlug: 'area-52',

    // Guild ranks that grant admin access (0 = GM, 1 = Officer)
    adminRanks: [0, 1] as readonly number[],

    // How often to re-verify guild membership (hours)
    membershipCacheTtlHours: 4,
};
