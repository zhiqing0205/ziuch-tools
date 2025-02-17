const API_BASE_URL = 'https://www.easyscholar.cc/open';
const API_KEY = '72697e3c8f624e788aba5296b23cf4c8';

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
        `${API_BASE_URL}/getPublicationRank?secretKey=${API_KEY}&publicationName=${encodeURIComponent(publicationName)}`
    );
    return response.json();
};
