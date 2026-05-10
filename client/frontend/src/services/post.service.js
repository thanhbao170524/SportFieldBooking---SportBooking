import api from '../api/axios';

/** Chuẩn hoá payload danh sách bài (API có thể trả mảng hoặc { items, total, page, limit }). */
export function unwrapPostListPayload(dataField) {
    if (dataField == null) return [];
    if (Array.isArray(dataField)) return dataField;
    if (typeof dataField === 'object' && Array.isArray(dataField.items)) return dataField.items;
    return [];
}

export function unwrapPostListMeta(dataField) {
    if (dataField == null) return {};
    if (Array.isArray(dataField)) {
        return { total: dataField.length, page: 1, limit: dataField.length };
    }
    if (typeof dataField === 'object' && Array.isArray(dataField.items)) {
        return {
            total: typeof dataField.total === 'number' ? dataField.total : dataField.items.length,
            page: dataField.page,
            limit: dataField.limit,
        };
    }
    return {};
}

export const postService = {
    /** Danh sách bài của chủ sân (phân trang: page, limit). */
    getOwnerPosts: async (clubId, params = {}) => {
        const response = await api.get('/owner/posts', {
            params: { clubId, ...params },
        });
        return response.data;
    },

    createPost: async (postData) => {
        const response = await api.post('/owner/posts', postData);
        return response.data;
    },

    createUserPost: async (postData) => {
        const response = await api.post('/posts', postData);
        return response.data;
    },

    updateUserPost: async (postId, postData) => {
        const response = await api.patch(`/posts/${postId}`, postData);
        return response.data;
    },

    updatePost: async (postId, postData) => {
        const response = await api.patch('/owner/posts', postData, {
            params: { id: postId },
        });
        return response.data;
    },

    deletePost: async (postId) => {
        const response = await api.delete('/owner/posts', {
            params: { id: postId },
        });
        return response.data;
    },

    /** Feed công khai (limit > 0 để có { items, total, page, limit }). */
    getPublicFeed: async (params = {}) => {
        const response = await api.get('/posts', { params });
        return response.data;
    },

    getPublicPost: async (postId) => {
        const response = await api.get(`/posts/${postId}`);
        return response.data;
    },

    /** Slug CLB + slug bài — link chia sẻ. */
    getSharedPost: async (clubSlug, postSlug) => {
        const response = await api.get(`/clubs/${encodeURIComponent(clubSlug)}/posts/${encodeURIComponent(postSlug)}`);
        return response.data;
    },

    recordPostView: async (postId) => {
        const response = await api.post(`/posts/${postId}/view`);
        return response.data;
    },

    getComments: async (postId) => {
        const response = await api.get(`/posts/${postId}/comments`);
        return response.data;
    },

    addComment: async (postId, content) => {
        const response = await api.post(`/posts/${postId}/comments`, { content });
        return response.data;
    },

    joinMatch: async (postId) => {
        const response = await api.post(`/posts/${postId}/join`);
        return response.data;
    },

    toggleLike: async (postId) => {
        const response = await api.post(`/posts/${postId}/like`);
        return response.data;
    },
};
