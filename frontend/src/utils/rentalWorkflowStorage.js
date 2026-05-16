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
    return value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 6);
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
      .flatMap((images) => normalizeImageList(images))
      .slice(0, 6);
  }

  return [];
};

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const removeDataUrlsFromImages = (obj) => {
  try {
    const cloned = JSON.parse(JSON.stringify(obj));
    Object.keys(cloned).forEach((bid) => {
      const entry = cloned[bid];
      if (entry && Array.isArray(entry.returnImages)) {
        entry.returnImages = entry.returnImages.filter((it) => typeof it === 'string' && it.startsWith('http'));
      }
      if (entry && Array.isArray(entry.receiveImages)) {
        entry.receiveImages = entry.receiveImages.filter((it) => typeof it === 'string' && it.startsWith('http'));
      }
    });
    return cloned;
  } catch {
    return obj;
  }
};

const writeAll = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // If quota exceeded, try persisting a sanitized version without data URLs
    try {
      const sanitized = removeDataUrlsFromImages(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      console.warn('[rentalWorkflowStorage] Storage quota exceeded - persisted sanitized workflows without data URLs');
    } catch (e) {
      console.warn('[rentalWorkflowStorage] Failed to persist rental workflows to localStorage', e);
    }
  }
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

  const { aiInspection: _omit, ...toPersistRaw } = next;

  // Persist only stable HTTP(S) image URLs to avoid storing large data-URLs in localStorage
  const toPersist = {
    ...toPersistRaw,
    returnImages: Array.isArray(toPersistRaw.returnImages)
      ? toPersistRaw.returnImages.filter((it) => typeof it === 'string' && it.startsWith('http')).slice(0, 6)
      : [],
    receiveImages: Array.isArray(toPersistRaw.receiveImages)
      ? toPersistRaw.receiveImages.filter((it) => typeof it === 'string' && it.startsWith('http')).slice(0, 6)
      : [],
  };

  all[String(bookingId)] = toPersist;
  writeAll(all);

  return next;
};
