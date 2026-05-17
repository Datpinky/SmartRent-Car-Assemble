import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import reviewService from '../../../services/reviewService';
import vehicleLocationService from '../../../services/vehicleLocationService';
import vehicleService from '../../../services/vehicleService';
import CarGrid from '../../CarGrid/CarGrid';
import FilterBar from '../../FilterBar/FilterBar';
import SearchBar from '../../SearchBar/SearchBar';

const DEFAULT_FILTERS = {
  seats: 'all',
  model: 'all',
  brand: 'all',
  category: 'all',
  fuel: 'all',
  priceMin: '',
  priceMax: '',
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const matchesExact = (actualValue, selectedValue) => {
  if (!selectedValue || selectedValue === 'all') {
    return true;
  }

  return normalizeText(actualValue) === normalizeText(selectedValue);
};

const matchesContains = (source, keyword) => {
  if (!keyword) {
    return true;
  }

  return normalizeText(source).includes(normalizeText(keyword));
};

const sortVehicles = (vehicles, sortValue) => {
  if (!sortValue || sortValue === 'all') {
    return vehicles;
  }

  const sorted = [...vehicles];
  if (sortValue === 'price_asc') {
    sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }
  if (sortValue === 'price_desc') {
    sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }
  return sorted;
};

const applyFilters = (baseVehicles, filters, search, sortValue) => {
  const filtered = baseVehicles.filter((vehicle) => {
    const price = Number(vehicle.price || 0);
    const minPrice = toNumber(filters.priceMin);
    const maxPrice = toNumber(filters.priceMax);
    const vehicleLocation = [
      vehicle.address,
      vehicle.pickupAddress,
      vehicle.location,
      vehicle.listerProfile?.publicAddress,
      vehicle.listerProfile?.address,
      vehicle.showroom,
    ]
      .filter(Boolean)
      .join(' ');
    const vehicleNameText = [vehicle.name, vehicle.brand, vehicle.model, vehicle.plateNumber].filter(Boolean).join(' ');

    const matchSeats = filters.seats === 'all' || Number(vehicle.seats || 0) === Number(filters.seats);
    const matchModel = matchesExact(vehicle.transmission, filters.model);
    const matchBrand = matchesExact(vehicle.brand, filters.brand);
    const matchCategory = matchesExact(vehicle.category || vehicle.type, filters.category);
    const matchFuel = matchesExact(vehicle.fuel, filters.fuel);
    const matchPriceMin = minPrice == null || price >= minPrice;
    const matchPriceMax = maxPrice == null || price <= maxPrice;
    const matchLocation = matchesContains(vehicleLocation, search.location);
    const matchCarName = matchesContains(vehicleNameText, search.carName);

    return (
      matchSeats &&
      matchModel &&
      matchBrand &&
      matchCategory &&
      matchFuel &&
      matchPriceMin &&
      matchPriceMax &&
      matchLocation &&
      matchCarName
    );
  });

  return sortVehicles(filtered, sortValue);
};

const mergeVehiclesWithLocation = async (vehicles = [], canReadVehicleLocation = false) => {
  if (!canReadVehicleLocation || vehicles.length === 0) {
    return vehicles;
  }

  const locationResults = await Promise.allSettled(
    vehicles.map((vehicle) => vehicleLocationService.getByVehicleId(vehicle._id || vehicle.id)),
  );

  return vehicles.map((vehicle, index) => {
    const locationResult = locationResults[index];
    const vehicleLocation = locationResult?.status === 'fulfilled' ? locationResult.value : null;
    const locationAddress = String(vehicleLocation?.address || '').trim();
    const latitude = Number(vehicleLocation?.latitude);
    const longitude = Number(vehicleLocation?.longitude);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (!locationAddress && !hasCoordinates) {
      return vehicle;
    }

    return {
      ...vehicle,
      vehicleLocation,
      pickupAddress: locationAddress || vehicle.pickupAddress || '',
      address: locationAddress || vehicle.address || '',
      location: locationAddress || vehicle.location || '',
      latitude: hasCoordinates ? latitude : vehicle.latitude,
      longitude: hasCoordinates ? longitude : vehicle.longitude,
      lat: hasCoordinates ? latitude : vehicle.lat,
      lng: hasCoordinates ? longitude : vehicle.lng,
    };
  });
};

const Home = () => {
  const { user } = useAuth();
  const [allCars, setAllCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [apiError, setApiError] = useState('');

  const currentFilters = useRef(DEFAULT_FILTERS);
  const currentSearch = useRef({ location: '', carName: '', pickupDate: '', returnDate: '' });
  const currentSort = useRef('all');
  const currentDatesRef = useRef({ pickupDate: '', returnDate: '' });
  const filterRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const loadVehiclesRef = useRef(null);

  const syncVisibleCars = (
    baseVehicles,
    nextFilters = currentFilters.current,
    nextSearch = currentSearch.current,
    nextSort = currentSort.current,
  ) => {
    const requestId = ++filterRequestRef.current;
    const locallyFiltered = applyFilters(baseVehicles, nextFilters, nextSearch, nextSort);
    if (!isMountedRef.current || requestId !== filterRequestRef.current) return;
    setFilteredCars(locallyFiltered);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Expose loadVehicles via ref so handleSearch can call it without stale closure
  useEffect(() => {
    loadVehiclesRef.current = async ({ pickupDate = '', returnDate = '', carName = '' } = {}) => {
      setLoadingVehicles(true);
      try {
        const listParams = { limit: 100 };
        if (pickupDate && returnDate) {
          listParams.available_from = pickupDate;
          listParams.available_to = returnDate;
        }
        if (carName && carName.trim()) {
          listParams.search = carName.trim();
        }
        const { data } = await vehicleService.getList(listParams);
        const vehiclesWithLocation = await mergeVehiclesWithLocation(data, Boolean(user));
        const vehiclesWithReviewSummary = await reviewService.enrichVehiclesWithSummary(vehiclesWithLocation, {
          limit: 100,
        });
        if (!isMountedRef.current) return;
        setAllCars(vehiclesWithReviewSummary);
        syncVisibleCars(vehiclesWithReviewSummary);
        setApiError('');
      } catch (error) {
        if (!isMountedRef.current) return;
        setAllCars([]);
        setFilteredCars([]);
        setApiError(error.message || 'Không thể tải dữ liệu!');
      } finally {
        if (isMountedRef.current) setLoadingVehicles(false);
      }
    };
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadVehiclesRef.current?.();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  const handleFilter = (payload) => {
    if (payload === 'all') {
      currentFilters.current = DEFAULT_FILTERS;
      syncVisibleCars(allCars, DEFAULT_FILTERS, currentSearch.current, currentSort.current);
      return;
    }
    if (typeof payload === 'object' && payload !== null) {
      currentFilters.current = { ...currentFilters.current, ...payload };
      syncVisibleCars(allCars, currentFilters.current, currentSearch.current, currentSort.current);
    }
  };

  const handleSearch = ({ location, carName, pickupDate = '', returnDate = '' }) => {
    const prevDates = currentDatesRef.current;
    const prevCarName = currentSearch.current.carName || '';
    currentSearch.current = { location, carName, pickupDate, returnDate };

    const datesChanged = prevDates.pickupDate !== pickupDate || prevDates.returnDate !== returnDate;
    const nameChanged = prevCarName !== (carName || '');
    if (datesChanged || nameChanged) {
      currentDatesRef.current = { pickupDate, returnDate };
      void loadVehiclesRef.current?.({ pickupDate, returnDate, carName });
    } else {
      syncVisibleCars(allCars, currentFilters.current, currentSearch.current, currentSort.current);
    }
  };

  const handleSort = (sortValue) => {
    currentSort.current = sortValue;
    syncVisibleCars(allCars, currentFilters.current, currentSearch.current, currentSort.current);
  };

  const loading = loadingVehicles;

  return (
    <main>
      {apiError && (
        <div className="mx-auto max-w-[1280px] px-5 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[0.82rem] text-red-700">
            <span className="font-semibold">Không thể tải danh sách xe!</span> {apiError}
          </div>
        </div>
      )}

      <SearchBar onSearch={handleSearch} />
      <FilterBar onFilter={handleFilter} onSort={handleSort} />
      <CarGrid cars={filteredCars} loading={loading} rentalSearch={currentSearch.current} />
    </main>
  );
};

export default Home;
