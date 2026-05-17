const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const throwError = require('../utils/throwError');

const SEVERITY_VALUES = ['none', 'minor', 'moderate', 'severe'];
const DEFAULT_DISCLAIMER =
  'Danh gia AI chi mang tinh ho tro, khong thay the cho kiem tra thuc te, nghiep vu hoac phap ly.';
const JSON_ONLY_SYSTEM_INSTRUCTION = [
  'You are an expert vehicle inspection assistant.',
  'Return exactly one valid JSON object that matches the response schema.',
  'Do not include markdown, code fences, prose, or extra keys outside the schema.',
  'Use Vietnamese for human-readable string fields.',
].join(' ');

const GALLERY_DAMAGE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    damage_detected: { type: SchemaType.BOOLEAN },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: SEVERITY_VALUES,
    },
    summary: { type: SchemaType.STRING },
    observations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          area: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          evidence: { type: SchemaType.STRING },
          severity_level: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: SEVERITY_VALUES,
          },
          likely_new_damage: { type: SchemaType.BOOLEAN },
          confidence: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['low', 'medium', 'high'],
          },
          needs_manual_review: { type: SchemaType.BOOLEAN },
          regions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                image_group: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: ['before', 'after'],
                },
                image_index: { type: SchemaType.NUMBER },
                x: { type: SchemaType.NUMBER },
                y: { type: SchemaType.NUMBER },
                width: { type: SchemaType.NUMBER },
                height: { type: SchemaType.NUMBER },
              },
            },
          },
        },
        required: [
          'area',
          'description',
          'evidence',
          'severity_level',
          'likely_new_damage',
          'confidence',
          'needs_manual_review',
        ],
      },
    },
    conclusion: { type: SchemaType.STRING },
    disclaimer: { type: SchemaType.STRING },
  },
  required: ['damage_detected', 'severity', 'summary', 'observations', 'conclusion', 'disclaimer'],
};

class AiService {
  constructor() {
    this._genAI = null;
  }

  getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throwError('GEMINI_API_KEY (hoac GOOGLE_API_KEY) chua duoc cau hinh', 503);
    }
    if (!this._genAI) {
      this._genAI = new GoogleGenerativeAI(apiKey);
    }
    return this._genAI;
  }

  _getModel(schema, maxOutputTokens = 8192) {
    const genAI = this.getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    return genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: JSON_ONLY_SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
  }

  _toInlineData(file) {
    return {
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    };
  }

  _toString(value, fallback = '') {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || fallback;
    }
    if (value === null || value === undefined) return fallback;
    return String(value).trim() || fallback;
  }

  _toBoolean(value) {
    return value === true;
  }

  _normalizeSeverity(value, fallback = 'none') {
    const normalized = this._toString(value, '').toLowerCase();
    return SEVERITY_VALUES.includes(normalized) ? normalized : fallback;
  }

  _severityRank(value) {
    return Math.max(0, SEVERITY_VALUES.indexOf(this._normalizeSeverity(value)));
  }

  _maxSeverity(values = []) {
    return values.reduce(
      (current, candidate) =>
        this._severityRank(candidate) > this._severityRank(current) ? this._normalizeSeverity(candidate) : current,
      'none',
    );
  }

  _normalizeConfidence(value) {
    const normalized = this._toString(value, '').toLowerCase();
    return ['low', 'medium', 'high'].includes(normalized) ? normalized : 'low';
  }

  _normalizeRegion(r) {
    const group = this._toString(r?.image_group, '').toLowerCase() === 'before' ? 'before' : 'after';
    const idx = Number.isFinite(Number(r?.image_index)) ? Math.max(0, Math.floor(Number(r.image_index))) : 0;
    const clamp = (n) => {
      const x = Number(n);
      if (!Number.isFinite(x)) return 0;
      return Math.min(1, Math.max(0, x));
    };
    return {
      image_group: group,
      image_index: idx,
      x: clamp(r?.x),
      y: clamp(r?.y),
      width: clamp(r?.width),
      height: clamp(r?.height),
    };
  }

  _normalizeGalleryObservation(obs) {
    const rawRegions = Array.isArray(obs?.regions) ? obs.regions : [];
    const regions = rawRegions
      .map((x) => this._normalizeRegion(x))
      .filter((reg) => reg.width > 0 && reg.height > 0);
    return {
      area: this._toString(obs?.area, 'Khong xac dinh'),
      description: this._toString(obs?.description, ''),
      evidence: this._toString(obs?.evidence, ''),
      severity_level: this._normalizeSeverity(obs?.severity_level, 'none'),
      likely_new_damage: this._toBoolean(obs?.likely_new_damage),
      confidence: this._normalizeConfidence(obs?.confidence),
      needs_manual_review: this._toBoolean(obs?.needs_manual_review),
      regions,
    };
  }

  _defaultGallerySummary(damageDetected, hasBefore = false) {
    if (!hasBefore) {
      return damageDetected
        ? 'AI phat hien mot so dau hieu hu hong can kiem tra them trong gallery anh hien tai.'
        : 'AI chua phat hien hu hong ro rang trong gallery anh hien tai.';
    }

    return damageDetected
      ? 'AI phat hien mot so thay doi can kiem tra them giua nhom anh BEFORE va AFTER.'
      : 'AI chua phat hien hu hong moi ro rang khi doi chieu nhom anh BEFORE va AFTER.';
  }

  _defaultGalleryConclusion(damageDetected, hasBefore = false) {
    if (!hasBefore) {
      return damageDetected
        ? 'Nen kiem tra truc tiep cac khu vuc duoc canh bao de xac nhan tinh trang xe.'
        : 'Xe co ve khong co dau hieu bat thuong ro rang trong cac anh da gui.';
    }

    return damageDetected
      ? 'Nen kiem tra truc tiep cac thay doi duoc canh bao de xac nhan muc do va nguyen nhan.'
      : 'Xe co ve khong co thay doi ro rang canh bao trong nhom anh AFTER.';
  }

  _concatCandidateTextParts(response) {
    try {
      const parts = response?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return '';
      return parts
        .map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();
    } catch {
      return '';
    }
  }

  _extractBalancedJsonObject(str) {
    const start = str.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < str.length; i++) {
      const char = str[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (inString) {
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) return str.slice(start, i + 1);
      }
    }

    return null;
  }

  _parseJsonResponse(raw, contextLabel = 'gemini') {
    let text = String(raw ?? '')
      .replace(/^\uFEFF/, '')
      .trim();

    if (!text) {
      throwError('Khong phan tich duoc ket qua AI (JSON khong hop le)', 502);
    }

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      text = fenced[1].trim();
    } else if (text.startsWith('```')) {
      text = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
    }

    const candidates = [];
    const balanced = this._extractBalancedJsonObject(text);
    if (balanced) candidates.push(balanced);

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sliced = text.slice(firstBrace, lastBrace + 1);
      if (!candidates.includes(sliced)) candidates.push(sliced);
    }

    if (!candidates.length) candidates.push(text);

    for (const candidate of candidates) {
      const variants = [candidate, candidate.replace(/,(\s*[}\]])/g, '$1')];
      for (const variant of variants) {
        try {
          return JSON.parse(variant);
        } catch {
          /* try next candidate */
        }
      }
    }

    const preview = text.slice(0, 400).replace(/\s+/g, ' ');
    console.warn(`[AiService] ${contextLabel} returned non-JSON output`, { preview });
    throwError('Khong phan tich duoc ket qua AI (JSON khong hop le)', 502);
  }

  _getRawResponseText(response) {
    try {
      return response.text()?.trim() || '';
    } catch {
      return this._concatCandidateTextParts(response);
    }
  }

  _throwIfEmptyResponse(response, raw, contextLabel) {
    if (raw) return;

    const blockReason = response?.promptFeedback?.blockReason;
    const finishReason = response?.candidates?.[0]?.finishReason;

    if (blockReason) {
      throwError(`Gemini tu choi yeu cau (${blockReason})`, 502);
    }

    if (finishReason && finishReason !== 'STOP') {
      throwError(`Gemini khong tra ve JSON hop le (${finishReason})`, 502);
    }

    throwError(`Gemini khong tra ve noi dung (${contextLabel})`, 502);
  }

  /**
   * Phân tích gallery ảnh xe tự do (không yêu cầu vị trí cụ thể).
   * images: Array of { type: 'file', buffer, mimetype } or { type: 'url', url }
   */
  async compareGalleryImages(images) {
    if (!Array.isArray(images) || images.length === 0) {
      throwError('Can it nhat mot anh de phan tich', 400);
    }
    if (images.length > 6) {
      throwError('Chi duoc phan tich toi da 6 anh', 400);
    }

    const model = this._getModel(GALLERY_DAMAGE_RESPONSE_SCHEMA, 8192);

    const prompt = [
      `Ban nhan ${images.length} anh cua mot chiec xe. Anh co the chup tu nhieu goc, khoang cach va khu vuc khac nhau.`,
      'Hay phan tich tinh trang hien tai cua xe, phat hien hu hong, tray xuoc, bien dang hoac diem dang luu y.',
      'Khong co nhom anh TRUOC nen khong duoc khang dinh chac chan hu hong moi. Neu can doi chieu thuc te, dat needs_manual_review = true.',
      'Neu co vung nghi van, co the them regions trong observation (toa do normalized 0..1); neu khong chac thi de regions = [].',
      '',
      'Tra ve DUY NHAT 1 JSON object hop le, khong markdown, khong code fence, khong text ngoai JSON.',
      'Neu khong thay hu hong hoac diem dang luu y, van phai giu du key va de observations = [].',
      'disclaimer phai nhac ro day chi la danh gia ho tro.',
      'Neu co vung nghi van ro rang, co the ghi regions trong tung observation (image_group: before|after + image_index + toa do normalized 0..1); neu khong chac thi de regions = [].',
    ].join('\n');

    const content = [{ text: prompt }];

    // Add all image data to content
    for (const image of images) {
      if (image.type === 'file' && image.buffer && image.mimetype) {
        content.push({
          inlineData: {
            mimeType: image.mimetype,
            data: image.buffer.toString('base64'),
          },
        });
      } else if (image.type === 'url' && image.url) {
        // For URLs, we'll add them as text references in the prompt
        // (Gemini API has limited support for external URLs)
        content[0].text += `\n- Anh tu URL: ${image.url}`;
      }
    }

    const result = await model.generateContent(content);
    const response = result.response;
    const raw = this._getRawResponseText(response);
    this._throwIfEmptyResponse(response, raw, 'gallery');

    const parsed = this._parseJsonResponse(raw, 'gallery');

    const observations = Array.isArray(parsed?.observations)
      ? parsed.observations.map((obs) => this._normalizeGalleryObservation(obs))
      : [];

    const damageDetected =
      this._toBoolean(parsed?.damage_detected) || observations.some((obs) => obs.likely_new_damage);
    const rawSeverity = this._normalizeSeverity(parsed?.severity, damageDetected ? 'minor' : 'none');

    return {
      damage_detected: damageDetected,
      severity: damageDetected ? rawSeverity : 'none',
      summary: this._toString(parsed?.summary, this._defaultGallerySummary(damageDetected)),
      observations,
      conclusion: this._toString(parsed?.conclusion, this._defaultGalleryConclusion(damageDetected)),
      disclaimer: this._toString(parsed?.disclaimer, DEFAULT_DISCLAIMER),
    };
  }

  async compareBeforeAfterGallery(beforeImages, afterImages) {
    if (!Array.isArray(afterImages) || afterImages.length === 0) {
      throwError('Can it nhat mot anh SAU de phan tich', 400);
    }
    if ((Array.isArray(beforeImages) && beforeImages.length > 6) || afterImages.length > 6) {
      throwError('Moi nhom anh chi duoc toi da 6 anh', 400);
    }

    const safeBefore = Array.isArray(beforeImages) ? beforeImages : [];
    const safeAfter = afterImages;
    const model = this._getModel(GALLERY_DAMAGE_RESPONSE_SCHEMA, 8192);

    const prompt = [
      `Ban nhan 2 nhom anh cua cung mot chiec xe: ${safeBefore.length} anh BEFORE va ${safeAfter.length} anh AFTER.`,
      'BEFORE la anh xe truoc khi ban giao. AFTER la anh xe khi duoc tra.',
      'Anh khong duoc gan vi tri co dinh, co the khac goc chup, anh sang, khoang cach hoac vung xe xuat hien.',
      '',
      'Nhiem vu:',
      '1. Tu nhan dien khu vuc xe co the doi chieu giua BEFORE va AFTER.',
      '2. Chi ket luan hu hong moi khi co bang chung hop ly giua BEFORE va AFTER.',
      '3. Neu AFTER co dau hieu hu hong nhung BEFORE thieu goc tuong ung, dat likely_new_damage = false va needs_manual_review = true.',
      '4. Khong coi khac biet do anh sang, bong, phan chieu, bui ban, goc chup, crop anh hoac anh mo la hu hong moi neu khong du bang chung.',
      '5. Moi observation co the kem regions (optional): danh sach vung nghi van tren anh BEFORE hoac AFTER.',
      '   image_index la chi so 0-based theo thu tu anh trong nhom before hoac after.',
      '   Toa do x,y,width,height la normalized 0..1 theo kich thuoc anh. Neu khong chac chan thi de regions = [].',
      '',
      'Tra ve DUY NHAT 1 JSON object hop le, khong markdown, khong code fence, khong text ngoai JSON.',
      'Neu khong thay hu hong moi ro rang va khong co diem nao can review thu cong, van phai giu du key va de observations = [].',
      'disclaimer phai nhac ro day chi la danh gia ho tro.',
    ].join('\n');

    const content = [{ text: prompt }];
    safeBefore.forEach((image, index) => {
      if (image.type === 'file' && image.buffer && image.mimetype) {
        content.push({ text: `BEFORE image ${index + 1}` });
        content.push(this._toInlineData(image));
      } else if (image.type === 'url' && image.url) {
        content[0].text += `\n- BEFORE URL ${index + 1}: ${image.url}`;
      }
    });
    safeAfter.forEach((image, index) => {
      if (image.type === 'file' && image.buffer && image.mimetype) {
        content.push({ text: `AFTER image ${index + 1}` });
        content.push(this._toInlineData(image));
      } else if (image.type === 'url' && image.url) {
        content[0].text += `\n- AFTER URL ${index + 1}: ${image.url}`;
      }
    });

    const result = await model.generateContent(content);
    const response = result.response;
    const raw = this._getRawResponseText(response);
    this._throwIfEmptyResponse(response, raw, 'before-after-gallery');

    const parsed = this._parseJsonResponse(raw, 'before-after-gallery');
    const observations = Array.isArray(parsed?.observations)
      ? parsed.observations.map((obs) => this._normalizeGalleryObservation(obs))
      : [];

    const damageDetected =
      this._toBoolean(parsed?.damage_detected) || observations.some((obs) => obs.likely_new_damage);
    const derivedSeverity = this._maxSeverity(observations.map((obs) => obs.severity_level));
    const rawSeverity = this._normalizeSeverity(
      parsed?.severity,
      damageDetected && derivedSeverity === 'none' ? 'minor' : derivedSeverity,
    );

    return {
      damage_detected: damageDetected,
      severity: damageDetected ? rawSeverity : 'none',
      summary: this._toString(parsed?.summary, this._defaultGallerySummary(damageDetected, true)),
      observations,
      conclusion: this._toString(parsed?.conclusion, this._defaultGalleryConclusion(damageDetected, true)),
      disclaimer: this._toString(parsed?.disclaimer, DEFAULT_DISCLAIMER),
      comparison_mode: 'gallery',
    };
  }
}

module.exports = new AiService();
