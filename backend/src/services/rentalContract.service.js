const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const PaymentModel = require('../models/payment.model');
const throwError = require('../utils/throwError');

const HEADER = {
    stateMotto: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    independence: 'Độc lập – Tự do – Hạnh phúc',
    title: 'HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI',
    legalBasis: [
        'Căn cứ Bộ Luật Dân sự 2015',
        'Căn cứ Luật thương mại 2005',
        'Căn cứ vào nhu cầu và khả năng cung ứng của các bên dưới đây.',
    ],
};

const ARTICLE_6_A = {
    obligations: [
        'Chuyển giao tài sản cho thuê đúng thỏa thuận ghi trong Hợp đồng',
        'Bảo đảm giá trị sử dụng của tài sản cho thuê',
        'Bảo đảm quyền sử dụng tài sản cho Bên B',
    ],
    rights: [
        'Nhận đủ tiền thuê tài sản theo phương thức đã thỏa thuận',
        'Nhận lại tài sản thuê khi hết hạn Hợp đồng',
        'Đơn phương đình chỉ thực hiện Hợp đồng và yêu cầu bồi thường thiệt hại nếu Bên B: không trả tiền thuê trong thời hạn đã thỏa thuận liên tiếp; sử dụng tài sản thuê không đúng công dụng/mục đích; làm tài sản thuê mất mát, hư hỏng; sửa chữa, đổi hoặc cho người khác thuê lại mà không có sự đồng ý của Bên A',
    ],
};

const ARTICLE_7_B = {
    obligations: [
        'Bảo quản tài sản thuê như tài sản của chính mình, không được thay đổi tình trạng tài sản, không được cho thuê lại tài sản nếu không có sự đồng ý của Bên A',
        'Sử dụng tài sản thuê đúng công dụng, mục đích của tài sản',
        'Trả đủ tiền thuê tài sản theo phương thức đã thỏa thuận',
        'Trả lại tài sản thuê đúng thời hạn và phương thức đã thỏa thuận',
        'Chịu toàn bộ chi phí liên quan đến chiếc xe trong quá trình thuê; nếu gây tai nạn, hỏng hóc phải thông báo ngay cho Bên A và chịu trách nhiệm sửa chữa, phục hồi nguyên trạng',
    ],
    rights: [
        'Nhận tài sản thuê theo đúng thỏa thuận',
        'Được sử dụng tài sản thuê theo đúng công dụng, mục đích của tài sản',
        'Đơn phương đình chỉ thực hiện Hợp đồng và yêu cầu bồi thường nếu Bên A chậm giao tài sản gây thiệt hại hoặc giao tài sản không đúng đặc điểm/tình trạng như Điều 1',
    ],
};

const ARTICLE_8 = {
    partyA: [
        'Thông tin nhân thân và về xe ô tô là đúng sự thật',
        'Không bỏ sót thành viên đồng sở hữu; nếu có khiếu kiện do bỏ sót, Bên A chịu trách nhiệm trước pháp luật',
        'Xe thuộc quyền sở hữu/sử dụng hợp pháp, không tranh chấp, không ràng buộc (cầm cố, thế chấp, cho thuê đang hiệu lực, v.v.)',
        'Giao kết hợp đồng tự nguyện, không lừa dối hoặc ép buộc',
        'Thực hiện đúng và đầy đủ các thỏa thuận trong hợp đồng',
    ],
    partyB: [
        'Thông tin pháp nhân/nhân thân trong hợp đồng là đúng sự thật',
        'Đã xem xét kỹ, biết rõ về tài sản thuê',
        'Giao kết hợp đồng tự nguyện, không lừa dối hoặc ép buộc',
        'Thực hiện đúng và đầy đủ các thỏa thuận trong hợp đồng',
    ],
    mutual: [
        'Mọi giấy tờ về nhân thân và tài sản là giấy tờ thật, cấp đúng thẩm quyền, còn hiệu lực pháp lý, không tẩy xóa/sửa chữa; nếu sai, các bên chịu trách nhiệm trước pháp luật',
        'Nếu tranh chấp dẫn đến hợp đồng vô hiệu (một phần), các bên tự chịu trách nhiệm',
        'Tại thời điểm ký kết, các bên minh mẫn, đủ năng lực hành vi dân sự',
    ],
};

const ARTICLE_9 = [
    'Nếu vì lý do bất khả kháng một bên chấm dứt trước hạn, phải báo trước theo thỏa thuận (số tháng ghi trong phụ lục/thỏa thuận bổ sung nếu có)',
    'Trước khi hết hiệu lực, hai bên trao đổi thanh lý; nếu tiếp tục thuê thì ký hợp đồng mới hoặc phụ lục gia hạn',
    'Hợp đồng có hiệu lực kể từ khi các bên ký kết; mọi sửa đổi bổ sung phải bằng văn bản',
    'Tranh chấp: ưu tiên thương lượng; không được thì khởi kiện tại Tòa án nhân dân có thẩm quyền',
    'Hai bên đã đọc, hiểu và đồng ý toàn bộ nội dung; ký tên/đóng dấu/điểm chỉ tự nguyện',
];

function sameId(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

/** Dữ liệu cứng minh họa khi DB không có CMND/CCCD — chỉ phục vụ hiển thị mẫu */
const DEMO_IDENTITY_DOCUMENT = {
    documentType: 'CCCD',
    idNumber: '079088012345',
    issuedBy: 'Cục Cảnh sát Quản lý hành chính về trật tự xã hội',
    issuedDate: '15/06/2018',
    note: 'Ví dụ hiển thị — thay bằng thông tin thật khi đồng bộ hồ sơ người dùng.',
};

/** Mẫu đại diện Nam/Nữ theo form hợp đồng (Bên A — showroom) */
const DEMO_REPRESENTATIVES_TEMPLATE_LESSOR = {
    male: {
        fullName: 'Nguyễn Văn An',
        yearOfBirth: 1980,
        idNumber: '079088011111',
        issuedBy: 'Công an TP. Hồ Chí Minh',
        issuedDate: '10/03/2021',
        permanentAddress: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    },
    female: {
        fullName: 'Trần Thị Bình',
        yearOfBirth: 1985,
        idNumber: '079088022222',
        issuedBy: 'Công an TP. Hồ Chí Minh',
        issuedDate: '22/08/2019',
        permanentAddress: '45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    },
    note: 'Đại diện Bên cho thuê (showroom) — dữ liệu mẫu theo khung Mau-Hop-Dong-Thue-Xe-Tu-Lai.md',
};

/** Mẫu đại diện Nam/Nữ theo form hợp đồng (Bên B — người thuê) */
const DEMO_REPRESENTATIVES_TEMPLATE_RENTER = {
    male: {
        fullName: 'Lê Văn Cường',
        yearOfBirth: 1992,
        idNumber: '079088033333',
        issuedBy: 'Công an tỉnh Đồng Nai',
        issuedDate: '05/12/2020',
        permanentAddress: '88 Đường 30/4, Phường Trung Dũng, TP. Biên Hòa, Đồng Nai',
    },
    female: {
        fullName: 'Phạm Thị Dung',
        yearOfBirth: 1994,
        idNumber: '079088044444',
        issuedBy: 'Công an tỉnh Đồng Nai',
        issuedDate: '18/04/2022',
        permanentAddress: '12 Đường Võ Thị Sáu, Phường Quyết Thắng, TP. Biên Hòa, Đồng Nai',
    },
    note: 'Đại diện Bên thuê — dữ liệu mẫu theo khung Mau-Hop-Dong-Thue-Xe-Tu-Lai.md',
};

function coalesce(...vals) {
    for (const v of vals) {
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
}

function fillIdentityDocument(overrides = {}) {
    return {
        documentType: coalesce(overrides.documentType, DEMO_IDENTITY_DOCUMENT.documentType),
        idNumber: coalesce(overrides.idNumber, overrides.cmnd, overrides.cccd, DEMO_IDENTITY_DOCUMENT.idNumber),
        issuedBy: coalesce(overrides.issuedBy, DEMO_IDENTITY_DOCUMENT.issuedBy),
        issuedDate: coalesce(overrides.issuedDate, DEMO_IDENTITY_DOCUMENT.issuedDate),
        note: coalesce(overrides.note, DEMO_IDENTITY_DOCUMENT.note),
    };
}

function mapUserToPartyContact(user) {
    if (!user) return null;
    const u = user.toObject ? user.toObject() : user;
    const idFromUser = {
        documentType: u.identity_document_type,
        idNumber: u.id_number ?? u.cmnd ?? u.cccd,
        issuedBy: u.id_issued_by,
        issuedDate: u.id_issued_date,
        note: u.identity_note,
    };
    return {
        name: u.name || null,
        email: u.email || null,
        phone: u.phone || null,
        age: u.age ?? null,
        address: u.address || null,
        role: u.role || null,
        identityDocument: fillIdentityDocument(idFromUser),
    };
}

function mapVehicleToArticle1(vehicle) {
    if (!vehicle) return null;
    const v = vehicle.toObject ? vehicle.toObject() : vehicle;
    return {
        brand: v.brand || v.vehicle_brand || null,
        model: v.model || v.vehicle_model || null,
        vehicleType: v.vehicle_type || null,
        paintColor: null,
        engineNumber: v.vehicle_engine_number || null,
        vin: v.vehicle_identification_number || null,
        numberOfSeats: v.number_of_seats ?? null,
        registrationValidUntil: null,
        plateNumber: v.vehicle_plate_number || null,
        registrationCertificateNumber: null,
        registrationIssuedBy: null,
        registrationIssuedDate: null,
        firstRegistrationDate: null,
        registeredOwnerName: null,
        registeredOwnerAddress: null,
        inspectionCertificateNumber: null,
        inspectionCenterNumber: null,
        inspectionIssuedDate: null,
        lessorWarranties: [
            'Không có tranh chấp về quyền sở hữu/sử dụng',
            'Không bị ràng buộc bởi hợp đồng thuê xe ô tô đang có hiệu lực',
        ],
        renterDriverLicense: {
            class: null,
            number: null,
            validUntil: null,
            note: 'Áp dụng khi Bên B là cá nhân; bổ sung từ giấy phép lái xe thực tế',
        },
    };
}

function contractNumberFromBooking(booking) {
    const y = booking.createdAt ? new Date(booking.createdAt).getFullYear() : new Date().getFullYear();
    const tail = booking._id.toString().slice(-6).toUpperCase();
    return `${tail}/HĐKT-${y}`;
}

function rentalDurationDescription(start, end) {
    if (!start || !end) return null;
    const ms = new Date(end) - new Date(start);
    const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    return {
        days,
        description: `${days} ngày (ước tính theo khoảng thời gian đặt xe trong hệ thống)`,
    };
}

class RentalContractService {
    async buildContract(bookingId) {
        if (!mongoose.isValidObjectId(bookingId)) {
            throwError('bookingId không hợp lệ', 400);
        }

        const booking = await Booking.findById(bookingId)
            .populate('user_id')
            .populate('showroom_id')
            .populate('vehicle_id');

        if (!booking) throwError('Không tìm thấy booking', 404);

        if (booking.status === 'cancelled') {
            throwError('Booking đã hủy, không phát hành hợp đồng', 400);
        }

        const successfulPayment = await PaymentModel.findOne({
            booking_id: booking._id,
            payment_status: 'successful',
        }).sort({ paid_at: -1, createdAt: -1 });

        if (!successfulPayment) {
            throwError(
                'Chỉ có thể xem hợp đồng sau khi thanh toán thành công. Vui lòng hoàn tất thanh toán.',
                403
            );
        }

        const vehicle = mapVehicleToArticle1(booking.vehicle_id);
        const duration = rentalDurationDescription(booking.start_date, booking.end_date);

        const partyA = {
            label: 'BÊN CHO THUÊ (Bên A)',
            showroom: mapUserToPartyContact(booking.showroom_id),
            representativesTemplate: { ...DEMO_REPRESENTATIVES_TEMPLATE_LESSOR },
        };

        const partyB = {
            label: 'BÊN THUÊ (Bên B)',
            renter: mapUserToPartyContact(booking.user_id),
            representativesTemplate: { ...DEMO_REPRESENTATIVES_TEMPLATE_RENTER },
        };

        const costs = {
            totalRentAmount: booking.total_price,
            currency: 'VND',
            rentalUnit: booking.vehicle_id?.vehicle_hire_charge_per_timing || 'day',
            amountInWords: null,
            amountInWordsNote: 'Có thể sinh bằng chữ ở client hoặc mở rộng service sau',
            payment: {
                paymentMethod: successfulPayment.payment_method,
                transactionCode: successfulPayment.transaction_code,
                paidAt: successfulPayment.paid_at,
                stripePaymentIntentId: successfulPayment.stripe_payment_intent_id || null,
                amountPaid: successfulPayment.amount,
                currency: successfulPayment.currency || 'vnd',
            },
        };

        const payload = {
            header: HEADER,
            contractMeta: {
                contractNumber: contractNumberFromBooking(booking),
                signedDate: successfulPayment.paid_at || booking.updatedAt,
                signedPlace: null,
                preamble: `Hôm nay, ngày … tháng … năm …, tại …, các bên ký kết hợp đồng theo dữ liệu hệ thống đặt xe mã booking: ${booking._id}.`,
            },
            partyA,
            partyB,
            article1_vehicleAndAgreement: {
                title: 'Điều 1. Đặc điểm và thỏa thuận thuê xe',
                vehicle,
                bookingNote: booking.note || '',
            },
            article2_rentalPeriod: {
                title: 'Điều 2. Thời hạn thuê xe ô tô',
                startDate: booking.start_date,
                endDate: booking.end_date,
                duration: duration?.description,
                durationDays: duration?.days,
            },
            article3_purpose: {
                title: 'Điều 3. Mục đích thuê',
                purposeFromNote: booking.note || null,
                defaultPurpose: 'Sử dụng xe ô tô tự lái theo đúng quy định pháp luật và thỏa thuận giữa các bên',
            },
            article4_priceAndPayment: {
                title: 'Điều 4. Giá thuê và phương thức thanh toán',
                rentPriceFigures: booking.total_price,
                rentPriceCurrency: 'VNĐ',
                rentPricePer: costs.rentalUnit,
                amountInWords: costs.amountInWords,
                paymentMethod: successfulPayment.payment_method,
                paymentDueNote: 'Thanh toán đã được ghi nhận qua hệ thống theo giao dịch thành công.',
                clauseCashHandling: 'Việc giao và nhận tiền (nếu có phát sinh ngoài hệ thống) do hai bên tự thực hiện và chịu trách nhiệm trước pháp luật.',
            },
            article5_deliveryAndReturn: {
                title: 'Điều 5. Phương thức giao, trả lại tài sản thuê',
                text: 'Hết thời hạn thuê, Bên B phải giao trả chiếc xe ô tô cho Bên A theo thỏa thuận và quy trình bàn giao của showroom.',
            },
            article6_lessorRightsObligations: {
                title: 'Điều 6. Nghĩa vụ và quyền của Bên A',
                ...ARTICLE_6_A,
            },
            article7_renterRightsObligations: {
                title: 'Điều 7. Nghĩa vụ và quyền của Bên B',
                ...ARTICLE_7_B,
            },
            article8_warranties: {
                title: 'Điều 8. Cam đoan của các bên',
                ...ARTICLE_8,
            },
            article9_finalProvisions: {
                title: 'Điều 9. Điều khoản cuối cùng',
                clauses: ARTICLE_9,
            },
            signatures: {
                title: 'Chữ ký các bên',
                table: [
                    { party: 'BÊN CHO THUÊ (Bên A)', instruction: 'Ký và ghi rõ họ tên / đóng dấu (nếu có)' },
                    { party: 'BÊN THUÊ (Bên B)', instruction: 'Ký và ghi rõ họ tên' },
                ],
                copiesNote: 'Hợp đồng được lập thành các bản có giá trị pháp lý như nhau, mỗi bên giữ một phần làm bằng chứng (theo thỏa thuận thực tế).',
            },
            bookingSnapshot: {
                _id: booking._id,
                status: booking.status,
                start_date: booking.start_date,
                end_date: booking.end_date,
                total_price: booking.total_price,
                note: booking.note,
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt,
            },
        };

        return payload;
    }
}

module.exports = new RentalContractService();
