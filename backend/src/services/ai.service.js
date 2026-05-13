const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const throwError = require('../utils/throwError');

/** Schema Gemini JSON mode — giảm lỗi parse so với chỉ dùng prompt. */
const DAMAGE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    damage_detected: { type: SchemaType.BOOLEAN },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['none', 'minor', 'moderate', 'severe'],
    },
    summary: { type: SchemaType.STRING },
    differences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          area: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          likely_new_damage: { type: SchemaType.BOOLEAN },
        },
      },
    },
    conclusion: { type: SchemaType.STRING },
    disclaimer: { type: SchemaType.STRING },
  },
  required: ['damage_detected', 'severity', 'summary', 'differences', 'conclusion', 'disclaimer'],
};

class AiService {
  constructor() {
    this._genAI = null;
  }

  getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throwError('GEMINI_API_KEY (hoặc GOOGLE_API_KEY) chưa được cấu hình', 503);
    }
    if (!this._genAI) {
      this._genAI = new GoogleGenerativeAI(apiKey);
    }
    return this._genAI;
  }

  /**
   * So sánh ảnh xe trước cho thuê (doanh nghiệp) và sau khi trả (người thuê).
   * @param {{ buffer: Buffer, mimetype: string }} before - ảnh tham chiếu trước thuê
   * @param {{ buffer: Buffer, mimetype: string }} after - ảnh khi trả xe
   */
  async compareVehicleRentalDamage(before, after) {
    const genAI = this.getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        'Bạn là chuyên gia đánh giá tình trạng xe cho thuê. Trả lời bằng tiếng Việt, đúng schema JSON.',
      generationConfig: {
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: DAMAGE_RESPONSE_SCHEMA,
      },
    });

    const userText = [
      'Bạn nhận hai ảnh xe ô tô (hoặc xe máy) theo thứ tự:',
      'ẢNH 1: tình trạng xe TRƯỚC KHI cho thuê (ảnh chuẩn của doanh nghiệp).',
      'ẢNH 2: tình trạng xe KHI TRẢ (ảnh do người thuê cung cấp).',
      '',
      'Nhiệm vụ: so sánh để phát hiện thiệt hại hoặc hư hỏng mới có khả năng xảy ra trong thời gian thuê.',
      'Nếu góc chụp hoặc ánh sáng khác nhau nhiều, hãy nêu rõ độ tin cậy bị ảnh hưởng và tránh kết luận quá chắc chắn.',
      'Trường "disclaimer" phải nhắc rằng đánh giá mang tính hỗ trợ, không thay thế kiểm tra thực tế / pháp lý.',
    ].join('\n');

    const result = await model.generateContent([
      { text: userText },
      {
        inlineData: {
          mimeType: before.mimetype,
          data: before.buffer.toString('base64'),
        },
      },
      {
        inlineData: {
          mimeType: after.mimetype,
          data: after.buffer.toString('base64'),
        },
      },
    ]);

    const response = result.response;
    let raw = '';
    try {
      raw = response.text()?.trim() || '';
    } catch {
      raw = this._concatCandidateTextParts(response);
    }

    if (!raw) {
      const blockReason = response.promptFeedback?.blockReason;
      throwError(blockReason ? `Gemini từ chối yêu cầu (${blockReason})` : 'Gemini không trả về nội dung', 502);
    }

    return this._parseJsonResponse(raw);
  }

  /** Khi response.text() ném lỗi (finish reason), vẫn thử lấy text từ parts. */
  _concatCandidateTextParts(response) {
    try {
      const parts = response?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return '';
      return parts
        .map((p) => (typeof p.text === 'string' ? p.text : ''))
        .join('')
        .trim();
    } catch {
      return '';
    }
  }

  /**
   * Cắt object JSON đầu tiên có ngoặc cân bằng (kể cả chuỗi có dấu " escape).
   * Tránh lỗi khi model thêm markdown / lời dẫn quanh JSON.
   */
  _extractBalancedJsonObject(str) {
    const start = str.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < str.length; i++) {
      const c = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c === '\\') {
          escape = true;
          continue;
        }
        if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return str.slice(start, i + 1);
      }
    }
    return null;
  }

  _parseJsonResponse(raw) {
    let text = String(raw ?? '')
      .replace(/^\uFEFF/, '')
      .trim();
    if (!text) {
      throwError('Không phân tích được kết quả AI (JSON không hợp lệ)', 502);
    }

    // Fence ```json ... ``` ở bất kỳ đâu trong chuỗi (SDK đôi khi nối thêm executableCode)
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
    const fb = text.indexOf('{');
    const lb = text.lastIndexOf('}');
    if (fb !== -1 && lb > fb) {
      const slice = text.slice(fb, lb + 1);
      if (!candidates.includes(slice)) candidates.push(slice);
    }
    if (!candidates.length) candidates.push(text);

    for (const slice of candidates) {
      const variants = [slice, slice.replace(/,(\s*[}\]])/g, '$1')];
      for (const v of variants) {
        try {
          return JSON.parse(v);
        } catch {
          /* thử tiếp */
        }
      }
    }

    throwError('Không phân tích được kết quả AI (JSON không hợp lệ)', 502);
  }

  /**
   * So sánh nhiều vị trí xe (tối đa 6) trong một lần gọi Gemini.
   * @param {Array<{ label: string, before: { buffer: Buffer, mimetype: string }, after: { buffer: Buffer, mimetype: string } }>} positions
   */
  async compareMultiPosition(positions) {
    if (!Array.isArray(positions) || positions.length === 0) {
      throwError('Cần ít nhất một cặp ảnh để phân tích', 400);
    }

    const genAI = this.getGenAI();
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const multiSchema = {
      type: SchemaType.OBJECT,
      properties: {
        damage_detected: { type: SchemaType.BOOLEAN },
        severity: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['none', 'minor', 'moderate', 'severe'],
        },
        summary: { type: SchemaType.STRING },
        positions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              position: { type: SchemaType.STRING },
              damage_detected: { type: SchemaType.BOOLEAN },
              severity: {
                type: SchemaType.STRING,
                format: 'enum',
                enum: ['none', 'minor', 'moderate', 'severe'],
              },
              differences: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    area: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    likely_new_damage: { type: SchemaType.BOOLEAN },
                  },
                },
              },
              notes: { type: SchemaType.STRING },
            },
            required: ['position', 'damage_detected', 'severity', 'differences', 'notes'],
          },
        },
        conclusion: { type: SchemaType.STRING },
        disclaimer: { type: SchemaType.STRING },
      },
      required: ['damage_detected', 'severity', 'summary', 'positions', 'conclusion', 'disclaimer'],
    };

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        'Bạn là chuyên gia đánh giá tình trạng xe cho thuê. Trả lời bằng tiếng Việt, đúng schema JSON.',
      generationConfig: {
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: multiSchema,
      },
    });

    // Build image list description for the prompt
    const positionLines = positions.map((p, i) => {
      const imgA = i * 2 + 2;
      const imgB = i * 2 + 3;
      return `- Vị trí ${i + 1} (${p.label}): ẢNH ${imgA} = trước thuê, ẢNH ${imgB} = khi trả xe.`;
    });

    const userText = [
      'Bạn nhận các ảnh xe ô tô theo thứ tự sau:',
      'ẢNH 1: bỏ qua (placeholder).',
      ...positionLines,
      '',
      'Với từng vị trí, hãy so sánh ảnh TRƯỚC và ảnh SAU để phát hiện hư hỏng, trầy xước, hay thay đổi mới.',
      'Nếu góc chụp / ánh sáng khác nhiều, hãy ghi rõ độ tin cậy bị ảnh hưởng.',
      `Trường "positions" phải có đúng ${positions.length} phần tử, theo thứ tự các vị trí trên.`,
      'Trường "disclaimer" phải nhắc rằng đánh giá mang tính hỗ trợ, không thay thế kiểm tra thực tế / pháp lý.',
    ].join('\n');

    // Build content array: placeholder text + image pairs
    const contentParts = [
      { text: userText },
      // placeholder image slot — not sent, referenced as "ẢNH 1: bỏ qua"
    ];
    for (const p of positions) {
      contentParts.push({
        inlineData: { mimeType: p.before.mimetype, data: p.before.buffer.toString('base64') },
      });
      contentParts.push({
        inlineData: { mimeType: p.after.mimetype, data: p.after.buffer.toString('base64') },
      });
    }

    const result = await model.generateContent(contentParts);
    const response = result.response;
    let raw = '';
    try {
      raw = response.text()?.trim() || '';
    } catch {
      raw = this._concatCandidateTextParts(response);
    }

    if (!raw) {
      const blockReason = response.promptFeedback?.blockReason;
      throwError(blockReason ? `Gemini từ chối yêu cầu (${blockReason})` : 'Gemini không trả về nội dung', 502);
    }

    return this._parseJsonResponse(raw);
  }
}

module.exports = new AiService();
