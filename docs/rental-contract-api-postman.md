# Rental Contract API — hướng dẫn test Postman

**Tên gợi ý trong Postman (Collection / Request):** `Rental Contract — GET by booking`

---

## 1. Biến môi trường (Postman Environment)

| Variable   | Ví dụ                          |
|-----------|---------------------------------|
| `baseUrl` | `http://localhost:3000`        |
| `token`   | JWT sau khi đăng nhập `/api/auth` |
| `bookingId` | `_id` của booking đã **thanh toán thành công** |

---

## 2. Request — lấy dữ liệu hợp đồng thuê xe

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/rental-contract/by-booking/{{bookingId}}`

**Headers:**

| Key             | Value              |
|-----------------|--------------------|
| `Authorization` | `Bearer {{token}}` |
| `Content-Type`  | `application/json` (tùy chọn cho GET) |

**Body:** không có.

---

## 3. Điều kiện để API trả 200

1. `bookingId` hợp lệ (Mongo ObjectId).
2. User đăng nhập phải là **người thuê** (`user_id` của booking), **showroom** (`showroom_id`), hoặc role **admin** / **owner**.
3. Trong DB phải có **Payment** với cùng `booking_id` và `payment_status: successful`.
4. Booking **không** ở trạng thái `cancelled`.

Nếu chưa có thanh toán thành công → **403** với message về cần thanh toán trước.

---

## 4. Ví dụ response thành công (rút gọn)

```json
{
  "message": "Lấy dữ liệu hợp đồng thuê xe thành công",
  "data": {
    "header": { "stateMotto": "...", "title": "HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI", "legalBasis": [] },
    "contractMeta": { "contractNumber": "...", "signedDate": "...", "preamble": "..." },
    "partyA": { "label": "BÊN CHO THUÊ (Bên A)", "showroom": {} },
    "partyB": { "label": "BÊN THUÊ (Bên B)", "renter": {} },
    "article1_vehicleAndAgreement": {},
    "article2_rentalPeriod": {},
    "article3_purpose": {},
    "article4_priceAndPayment": {},
    "article5_deliveryAndReturn": {},
    "article6_lessorRightsObligations": {},
    "article7_renterRightsObligations": {},
    "article8_warranties": {},
    "article9_finalProvisions": {},
    "signatures": {},
    "bookingSnapshot": {}
  }
}
```

---

## 5. Mã lỗi thường gặp khi test

| HTTP | Nguyên nhân gợi ý |
|------|-------------------|
| 401  | Thiếu/sai `Bearer` token |
| 403  | Không phải bên liên quan booking **hoặc** chưa có payment `successful` |
| 404  | Sai `bookingId` |
| 400  | `bookingId` không phải MongoId / booking đã `cancelled` |

---

## 6. Thứ tự test thực tế (flow)

1. `POST` đăng nhập → copy `accessToken` vào `{{token}}`.
2. Tạo booking (nếu chưa có) → lấy `bookingId`.
3. Tạo / hoàn tất thanh toán Stripe (hoặc sync intent) để trong DB có `payment_status: successful`.
4. Gọi `GET` URL ở mục 2.

---

## 7. Import nhanh vào Postman (raw cURL)

Thay `YOUR_TOKEN` và `BOOKING_ID`:

```bash
curl -X GET "http://localhost:3000/api/rental-contract/by-booking/BOOKING_ID" ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

(Linux/macOS: bỏ `^`, dùng `\` xuống dòng hoặc một dòng.)

---

*Tài liệu này đi kèm mẫu hợp đồng:* `Mau-Hop-Dong-Thue-Xe-Tu-Lai.md`
