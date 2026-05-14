const STORAGE_KEY = 'smartrent:rental-workflows';
const RETURN_POSITION_KEYS = ['front', 'rear', 'left', 'right', 'interior', 'odometer'];

/** Chỉ draft cục bộ (checklist, ghi chú, URL ảnh tạm). Báo cáo AI chính lấy từ server theo bookingId. */
const DEFAULT_WORKFLOW = {
    receiveChecklist: {
        exterior: false,
        interior: false,
        documents: false,
        fuelLevel: false,
    },
    receiveNote: '',
    receiveImages: [],
    returnChecklist: {
        belongings: false,
        cleanliness: false,
        damagesChecked: false,
        fuelLevel: false,
    },
    returnNote: '',
    returnImages: {},
    updatedAt: '',
};

const normalizeImageList = (value) => {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string' && item.trim());
    }
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    return [];
};

const normalizeReturnImages = (value) => {
    if (Array.isArray(value)) {
        return RETURN_POSITION_KEYS.reduce((acc, key, index) => {
            const normalized = normalizeImageList(value[index]);
            if (normalized.length) acc[key] = normalized;
            return acc;
        }, {});
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [key, images]) => {
            const normalized = normalizeImageList(images);
            if (normalized.length) acc[key] = normalized;
            return acc;
        }, {});
    }

    return {};
};

const readAll = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const writeAll = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getRentalWorkflow = (bookingId) => {
    if (!bookingId) {
        return { ...DEFAULT_WORKFLOW };
    }

    const all = readAll();
    const rawStored = all[String(bookingId)] || {};
    const { aiInspection: _legacyAi, ...stored } = rawStored;

    return {
        ...DEFAULT_WORKFLOW,
        ...stored,
        receiveChecklist: {
            ...DEFAULT_WORKFLOW.receiveChecklist,
            ...(stored.receiveChecklist || {}),
        },
        returnChecklist: {
            ...DEFAULT_WORKFLOW.returnChecklist,
            ...(stored.returnChecklist || {}),
        },
        receiveImages: Array.isArray(stored.receiveImages) ? stored.receiveImages : [],
        returnImages: normalizeReturnImages(stored.returnImages),
    };
};

export const saveRentalWorkflow = (bookingId, updates) => {
    if (!bookingId) {
        return getRentalWorkflow('');
    }

    const all = readAll();
    const current = getRentalWorkflow(bookingId);
    const { aiInspection: _dropAi, ...updatesSafe } = updates;

    const next = {
        ...current,
        ...updatesSafe,
        receiveChecklist: {
            ...current.receiveChecklist,
            ...(updatesSafe.receiveChecklist || {}),
        },
        returnChecklist: {
            ...current.returnChecklist,
            ...(updatesSafe.returnChecklist || {}),
        },
        returnImages: normalizeReturnImages(updatesSafe.returnImages ?? current.returnImages),
        updatedAt: new Date().toISOString(),
    };

    const { aiInspection: _omit, ...toPersist } = next;

    all[String(bookingId)] = toPersist;
    writeAll(all);

    return next;
};
