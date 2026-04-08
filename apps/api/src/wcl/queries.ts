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
