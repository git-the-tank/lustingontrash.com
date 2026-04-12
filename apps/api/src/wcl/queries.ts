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
