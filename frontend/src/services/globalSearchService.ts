import api from '../api/axios';

export type GlobalSearchResultType =
    | 'employee'
    | 'client'
    | 'project'
    | 'task'
    | 'comment'
    | 'report'
    | 'file';

export type GlobalSearchFilter = 'all' | `${GlobalSearchResultType}s` | 'comments';

export interface GlobalSearchResult {
    id: string;
    type: GlobalSearchResultType;
    title: string;
    subtitle?: string;
    url: string;
}

interface GlobalSearchEnvelope {
    success?: boolean;
    data?: GlobalSearchResult[];
}

const normalizeResult = (result: Partial<GlobalSearchResult> | null | undefined): GlobalSearchResult | null => {
    if (!result?.id || !result?.title || !result?.url || !result?.type) {
        return null;
    }

    return {
        id: String(result.id),
        type: result.type,
        title: String(result.title),
        subtitle: result.subtitle ? String(result.subtitle) : undefined,
        url: String(result.url),
    };
};

export const globalSearchService = {
    search: async (query: string, filter: GlobalSearchFilter = 'all'): Promise<GlobalSearchResult[]> => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            return [];
        }

        const response = await api.get<GlobalSearchEnvelope | GlobalSearchResult[]>('/search', {
            params: { q: trimmedQuery, filter },
        });

        const payload = response.data;
        const results = Array.isArray(payload) ? payload : payload.data ?? [];

        return results
            .map((result) => normalizeResult(result))
            .filter((result): result is GlobalSearchResult => result !== null);
    },
};
