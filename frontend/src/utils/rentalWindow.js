const parseDateTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseRentalDateTime = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isSameCalendarDate = (leftValue, rightValue) => {
  const left = leftValue instanceof Date ? leftValue : parseRentalDateTime(leftValue);
  const right = rightValue instanceof Date ? rightValue : parseRentalDateTime(rightValue);

  if (!left || !right) {
    return false;
  }

  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
};

const pad2 = (value) => String(value).padStart(2, '0');

export const toLocalDateTimeInputValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const buildDefaultPickupDate = () => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 2);
  return toLocalDateTimeInputValue(date);
};

export const buildDefaultReturnDate = (pickupDate = '') => {
  const pickup = parseDateTime(pickupDate) || new Date();
  const next = new Date(pickup);
  next.setDate(next.getDate() + 2);
  return toLocalDateTimeInputValue(next);
};

export const buildDefaultRentalWindow = () => {
  const pickupDate = buildDefaultPickupDate();
  return {
    pickupDate,
    returnDate: buildDefaultReturnDate(pickupDate),
  };
};

export const sanitizeRentalWindow = (pickupDate = '', returnDate = '') => {
  const pickup = parseDateTime(pickupDate);
  const returnDateTime = parseDateTime(returnDate);

  if (!pickup || !returnDateTime || pickup.getTime() >= returnDateTime.getTime()) {
    return { pickupDate: '', returnDate: '' };
  }

  return { pickupDate, returnDate };
};

export const buildRentalWindowQuery = (pickupDate = '', returnDate = '') => {
  const window = sanitizeRentalWindow(pickupDate, returnDate);

  if (!window.pickupDate || !window.returnDate) {
    return '';
  }

  const params = new URLSearchParams({
    pickup: window.pickupDate,
    return: window.returnDate,
  });

  return `?${params.toString()}`;
};

export const resolveRentalWindow = ({ state, search } = {}) => {
  const fromState = sanitizeRentalWindow(
    state?.rentalSearch?.pickupDate || state?.pickupDate || '',
    state?.rentalSearch?.returnDate || state?.returnDate || ''
  );

  if (fromState.pickupDate && fromState.returnDate) {
    return fromState;
  }

  const params = new URLSearchParams(search || '');
  return sanitizeRentalWindow(params.get('pickup') || '', params.get('return') || '');
};
