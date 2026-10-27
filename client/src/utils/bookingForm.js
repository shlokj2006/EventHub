export const parseBookingQuantity = (value) => {
    if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
    const quantity = typeof value === 'number' ? value : Number(value);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
};

export const reconcileAttendees = (previous, quantity) =>
    Array.from({ length: quantity }, (_, index) => previous[index] || { name: '', email: '' });

export const isQuantityAvailable = (quantity, availableSeats) =>
    Number.isSafeInteger(quantity) && quantity > 0 &&
    Number.isSafeInteger(availableSeats) && availableSeats >= quantity;

export const resolveQuantityDraft = (draft, availableSeats) => {
    const quantity = parseBookingQuantity(draft);
    return quantity !== null && isQuantityAvailable(quantity, availableSeats) ? quantity : null;
};

export const estimateBookingTotal = (unitPrice, quantity) =>
    Number.isFinite(unitPrice) && unitPrice >= 0 && Number.isSafeInteger(quantity) && quantity > 0
        ? unitPrice * quantity
        : null;
