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

const DIFFERENCE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    area: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    likely_new_damage: { type: SchemaType.BOOLEAN },
  },
  required: ['area', 'description', 'likely_new_damage'],
};

const DAMAGE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    damage_detected: { type: SchemaType.BOOLEAN },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: SEVERITY_VALUES,
    },
    summary: { type: SchemaType.STRING },
    differences: {
      type: SchemaType.ARRAY,
      items: DIFFERENCE_SCHEMA,
    },
    conclusion: { type: SchemaType.STRING },
    disclaimer: { type: SchemaType.STRING },
  },
  required: ['damage_detected', 'severity', 'summary', 'differences', 'conclusion', 'disclaimer'],
};

const POSITION_RESULT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    position: { type: SchemaType.STRING },
    damage_detected: { type: SchemaType.BOOLEAN },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: SEVERITY_VALUES,
    },
    differences: {
      type: SchemaType.ARRAY,
      items: DIFFERENCE_SCHEMA,
    },
    notes: { type: SchemaType.STRING },
  },
  required: ['position', 'damage_detected', 'severity', 'differences', 'notes'],
};

const MULTI_DAMAGE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    damage_detected: { type: SchemaType.BOOLEAN },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: SEVERITY_VALUES,
    },
    summary: { type: SchemaType.STRING },
    positions: {
      type: SchemaType.ARRAY,
      items: POSITION_RESULT_SCHEMA,
    },
    conclusion: { type: SchemaType.STRING },
    disclaimer: { type: SchemaType.STRING },
  },
  required: ['damage_detected', 'severity', 'summary', 'positions', 'conclusion', 'disclaimer'],
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

  _normalizeDifference(item) {
    return {
      area: this._toString(item?.area, 'Khong xac dinh'),
      description: this._toString(item?.description, ''),
      likely_new_damage: this._toBoolean(item?.likely_new_damage),
    };
  }

  _defaultSingleSummary(damageDetected) {
    return damageDetected
      ? 'AI phat hien thay doi can kiem tra them giua anh truoc va anh sau.'
      : 'AI chua phat hien hu hong moi ro rang giua hai anh.';
  }

  _defaultSingleConclusion(damageDetected) {
    return damageDetected
      ? 'Nen kiem tra truc tiep de xac nhan muc do va nguyen nhan thay doi.'
      : 'Xe co ve khong co thay doi ro rang canh bao trong cap anh nay.';
  }

  _defaultMultiSummary(damageDetected, count) {
    return damageDetected
      ? `AI phat hien it nhat mot vi tri can luu y trong ${count} vi tri da so sanh.`
      : `AI chua phat hien hu hong moi ro rang trong ${count} vi tri da so sanh.`;
  }

  _defaultMultiConclusion(damageDetected) {
    return damageDetected
      ? 'Nen doi chieu truc tiep tung vi tri duoc canh bao de xac nhan ket qua.'
      : 'Khong co dau hieu bat thuong ro rang trong cac vi tri da duoc AI so sanh.';
  }

  _normalizePositionResult(item, fallbackLabel) {
    const differences = Array.isArray(item?.differences) ? item.differences.map((entry) => this._normalizeDifference(entry)) : [];
    const damageDetected = this._toBoolean(item?.damage_detected) || differences.some((entry) => entry.likely_new_damage);
    const rawSeverity = this._normalizeSeverity(item?.severity, damageDetected ? 'minor' : 'none');

    return {
      position: this._toString(item?.position, fallbackLabel),
      damage_detected: damageDetected,
      severity: damageDetected ? rawSeverity : 'none',
      differences,
      notes: this._toString(
        item?.notes,
        damageDetected ? 'Can doi chieu thuc te de xac nhan thay doi.' : 'Khong thay thay doi moi ro rang.',
      ),
    };
  }

  _normalizeSingleDamagePayload(payload) {
    const differences = Array.isArray(payload?.differences) ? payload.differences.map((entry) => this._normalizeDifference(entry)) : [];
    const damageDetected = this._toBoolean(payload?.damage_detected) || differences.some((entry) => entry.likely_new_damage);
    const rawSeverity = this._normalizeSeverity(payload?.severity, damageDetected ? 'minor' : 'none');

    return {
      damage_detected: damageDetected,
      severity: damageDetected ? rawSeverity : 'none',
      summary: this._toString(payload?.summary, this._defaultSingleSummary(damageDetected)),
      differences,
      conclusion: this._toString(payload?.conclusion, this._defaultSingleConclusion(damageDetected)),
      disclaimer: this._toString(payload?.disclaimer, DEFAULT_DISCLAIMER),
    };
  }

  _normalizeMultiDamagePayload(payload, expectedLabels = []) {
    const sourcePositions = Array.isArray(payload?.positions) ? payload.positions : [];
    const fallbackLabels =
      expectedLabels.length > 0 ? expectedLabels : sourcePositions.map((_, index) => `Vi tri ${index + 1}`);

    const normalizedPositions = fallbackLabels.map((label, index) =>
      this._normalizePositionResult(sourcePositions[index], label),
    );

    const damageDetected =
      this._toBoolean(payload?.damage_detected) || normalizedPositions.some((position) => position.damage_detected);
    const derivedSeverity = this._maxSeverity(normalizedPositions.map((position) => position.severity));
    const topSeverity = damageDetected
      ? this._normalizeSeverity(payload?.severity, derivedSeverity === 'none' ? 'minor' : derivedSeverity)
      : 'none';

    return {
      damage_detected: damageDetected,
      severity: topSeverity,
      summary: this._toString(payload?.summary, this._defaultMultiSummary(damageDetected, normalizedPositions.length)),
      positions: normalizedPositions,
      conclusion: this._toString(payload?.conclusion, this._defaultMultiConclusion(damageDetected)),
      disclaimer: this._toString(payload?.disclaimer, DEFAULT_DISCLAIMER),
    };
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

  async compareVehicleRentalDamage(before, after) {
    const model = this._getModel(DAMAGE_RESPONSE_SCHEMA, 4096);
    const prompt = [
      'Ban nhan 2 anh cua cung mot vi tri xe.',
      'Anh 1 la truoc khi cho thue.',
      'Anh 2 la khi tra xe.',
      'So sanh de phat hien hu hong moi, tray xuoc moi, bien dang moi hoac thay doi dang luu y.',
      'Neu goc chup khac nhau, hay ghi ro muc do anh huong den do tin cay.',
      'Tra ve DUY NHAT 1 JSON object hop le, khong markdown, khong code fence, khong text ngoai JSON.',
      'Neu khong thay hu hong moi, van phai giu day du cac key va de differences = [].',
      'disclaimer phai nhac ro day chi la danh gia ho tro.',
    ].join('\n');

    const result = await model.generateContent([{ text: prompt }, this._toInlineData(before), this._toInlineData(after)]);
    const response = result.response;
    const raw = this._getRawResponseText(response);
    this._throwIfEmptyResponse(response, raw, 'single-position');

    const parsed = this._parseJsonResponse(raw, 'single-position');
    return this._normalizeSingleDamagePayload(parsed);
  }

  async compareMultiPosition(positions) {
    if (!Array.isArray(positions) || positions.length === 0) {
      throwError('Can it nhat mot cap anh de phan tich', 400);
    }

    const model = this._getModel(MULTI_DAMAGE_RESPONSE_SCHEMA, 8192);
    const positionLines = positions.map(
      (position, index) => `- Vi tri ${index + 1}: ${position.label}. Cap anh gui theo thu tu TRUOC roi SAU.`,
    );

    const prompt = [
      'Ban nhan nhieu cap anh xe. Moi vi tri co dung 2 anh: TRUOC roi SAU.',
      ...positionLines,
      '',
      'Voi tung vi tri, hay so sanh anh TRUOC va anh SAU de phat hien thay doi moi.',
      `Mang "positions" bat buoc co dung ${positions.length} phan tu va giu dung thu tu nhu danh sach tren.`,
      'Tra ve DUY NHAT 1 JSON object hop le, khong markdown, khong code fence, khong text ngoai JSON.',
      'Neu mot vi tri khong co hu hong moi ro rang, van phai giu du key voi differences = [].',
      'disclaimer phai nhac ro day chi la danh gia ho tro.',
    ].join('\n');

    const content = [{ text: prompt }];
    for (const position of positions) {
      content.push(this._toInlineData(position.before));
      content.push(this._toInlineData(position.after));
    }

    const result = await model.generateContent(content);
    const response = result.response;
    const raw = this._getRawResponseText(response);
    this._throwIfEmptyResponse(response, raw, 'multi-position');

    const parsed = this._parseJsonResponse(raw, 'multi-position');
    return this._normalizeMultiDamagePayload(
      parsed,
      positions.map((position) => this._toString(position.label, 'Vi tri can doi chieu')),
    );
  }
}

module.exports = new AiService();
