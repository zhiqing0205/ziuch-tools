export interface PublicationRankResponse {
    code: number;
    msg: string;
    data: {
        officialRank: {
            all: Record<string, string>;
        };
    } | null;
}

export const getPublicationRank = async (publicationName: string): Promise<PublicationRankResponse> => {
    const response = await fetch(
        `/api/pub-finder?publicationName=${encodeURIComponent(publicationName)}`
    );
    return response.json();
};
