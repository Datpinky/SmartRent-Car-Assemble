const mapService = require('../services/map.service');

class MapController {
    async forward(req, res, next) {
        try {
            const { address } = req.query;
            if (!address) {
                return res.status(400).json({ message: 'Thiếu địa chỉ trong query' });
            }

            const result = await mapService.forward(address);

            if (!result || result.data.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
            }

            return res.status(200).json({
                message: 'Lấy tọa độ thành công',
                data: result.data
            });
        } catch (error) {
            next(error);
        }
    }

    async reverse(req, res, next) {
        try {
            const { lat, lon } = req.query;
            if (!lat || !lon) {
                return res.status(400).json({ message: 'Thiếu lat/lon trong query' });
            }

            const result = await mapService.reverse(lat, lon);

            if (!result || result.data.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
            }

            return res.status(200).json({
                message: 'Lấy địa chỉ thành công',
                data: result.data
            });
        } catch (error) {
            next(error);
        }
    }

    async autocomplete(req, res, next) {
        try {
            const { input, limit, dedupe, countrycodes, normalizecity } = req.query;

            if (!input) {
                return res.status(400).json({ message: 'Thiếu input để gợi ý địa chỉ' });
            }

            const result = await mapService.autocomplete(input, {
                limit: limit ? parseInt(limit, 10) : undefined,
                dedupe: dedupe ? parseInt(dedupe, 10) : undefined,
                countrycodes,
                normalizecity
            });

            return res.status(200).json({
                message: 'Gợi ý địa chỉ thành công',
                data: result.data
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MapController();