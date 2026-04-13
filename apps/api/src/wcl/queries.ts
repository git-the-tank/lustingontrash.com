import { gql } from 'graphql-request';

export const GUILD_MEMBERS_QUERY = gql`
    query GuildMembers($id: Int!) {
        guildData {
            guild(id: $id) {
                id
                name
                server {
                    name
                    slug
                    region {
                        slug
                    }
                }
                members {
                    data {
                        id
                        name
                        classID
                        guildRank
                        server {
                            name
                            slug
                        }
                    }
                }
            }
        }
    }
`;

// Returns every boss ranking for a character in a zone, in a single request.
// zoneRankings is a JSON scalar — see WclZoneRankings type below for the shape
// we actually parse out of it (rankings[] is the interesting part).
export const CHARACTER_ZONE_RANKINGS_QUERY = gql`
    query CharacterZoneRankings(
        $name: String!
        $serverSlug: String!
        $serverRegion: String!
        $zoneId: Int!
        $difficulty: Int!
        $metric: CharacterPageRankingMetricType!
    ) {
        characterData {
            character(
                name: $name
                serverSlug: $serverSlug
                serverRegion: $serverRegion
            ) {
                id
                zoneRankings(
                    zoneID: $zoneId
                    difficulty: $difficulty
                    metric: $metric
                )
            }
        }
    }
`;

// Discovers guild reports with a sliding watermark. Returns paginated results;
// loop until has_more_pages is falsy.
export const GUILD_REPORTS_QUERY = gql`
    query GuildReports($id: Int!, $startTime: Float, $page: Int) {
        guildData {
            guild(id: $id) {
                reports(startTime: $startTime, limit: 25, page: $page) {
                    data {
                        code
                        startTime
                        endTime
                        title
                        zone {
                            id
                        }
                    }
                    has_more_pages
                    current_page
                }
            }
        }
    }
`;

// Fetches fights list and masterData for a single report in one request.
// Stored as RawPayloadCache with sourceType REPORT_SPINE.
export const REPORT_SPINE_QUERY = gql`
    query ReportSpine($code: String!) {
        reportData {
            report(code: $code) {
                startTime
                endTime
                title
                zone {
                    id
                }
                fights {
                    id
                    name
                    encounterID
                    difficulty
                    kill
                    startTime
                    endTime
                    bossPercentage
                    fightPercentage
                    phaseTransitions {
                        id
                        startTime
                    }
                }
                masterData {
                    actors {
                        id
                        name
                        type
                        subType
                        gameID
                        guid
                    }
                    abilities {
                        gameID
                        name
                        icon
                    }
                }
            }
        }
    }
`;

// Enumerates all zones + their encounters. Used by the discovery script to
// pin down the current-tier zone and encounter IDs.
export const WORLD_ZONES_QUERY = gql`
    query WorldZones {
        worldData {
            zones {
                id
                name
                frozen
                expansion {
                    id
                    name
                }
                encounters {
                    id
                    name
                }
            }
        }
    }
`;
