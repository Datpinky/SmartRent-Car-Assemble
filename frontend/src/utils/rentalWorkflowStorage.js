const STORAGE_KEY = 'smartrent:rental-workflows';

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
    returnImages: [],
    updatedAt: '',
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
        returnImages: Array.isArray(stored.returnImages) ? stored.returnImages : [],
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
        updatedAt: new Date().toISOString(),
    };

    const { aiInspection: _omit, ...toPersist } = next;

    all[String(bookingId)] = toPersist;
    writeAll(all);

    return next;
};
