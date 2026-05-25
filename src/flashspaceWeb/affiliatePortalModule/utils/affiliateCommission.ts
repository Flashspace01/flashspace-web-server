type BookingLike = {
  type?: string;
  plan?: {
    originalPrice?: number;
    discount?: number;
    price?: number;
    finalPrice?: number;
    partnerPrice?: number;
    tenure?: number;
    tenureUnit?: string;
    name?: string;
  };
  tenure?: string;
};

const LEGACY_COMMISSION_RATE = 0.15;

const toMoney = (value: number): number => Number(value.toFixed(2));

export const getPaidAmount = (booking: BookingLike): number => {
  // If we have originalPrice, the pre-GST amount is originalPrice - discount
  if (booking.plan?.originalPrice !== undefined) {
    return Number(booking.plan.originalPrice) - Number(booking.plan.discount || 0);
  }
  // Fallback: If we only have the final price with GST, remove the 18% GST
  const priceWithGst = Number(booking.plan?.price || booking.plan?.finalPrice || 0);
  return priceWithGst > 0 ? priceWithGst / 1.18 : 0;
};

export const getYearsFromBooking = (booking: BookingLike): number => {
  if (booking.plan?.tenure) {
    if (booking.plan.tenureUnit === "months" || !booking.plan.tenureUnit) {
      return Math.max(1, Math.round(booking.plan.tenure / 12));
    } else if (booking.plan.tenureUnit === "years") {
      return booking.plan.tenure;
    }
  }
  if (booking.tenure && typeof booking.tenure === 'string') {
    const matchYears = booking.tenure.match(/(\d+)\s*year/i);
    if (matchYears) return parseInt(matchYears[1], 10);
    
    const matchMonths = booking.tenure.match(/(\d+)\s*month/i);
    if (matchMonths) return Math.max(1, Math.round(parseInt(matchMonths[1], 10) / 12));
  }
  return 1;
};

export const getPartnerBaseAmount = (booking: BookingLike): number => {
  return Number(booking.plan?.partnerPrice || 0);
};

export const calculateAffiliateCommission = (booking: BookingLike): number => {
  const years = getYearsFromBooking(booking);
  
  // Determine Base Price for 1 year (pre-GST)
  let basePrice = 12000; // Default fallback for VO
  if (booking.plan?.originalPrice) {
    basePrice = booking.plan.originalPrice / years;
  } else {
    // Try to guess from final price if originalPrice is missing
    const priceWithGst = Number(booking.plan?.price || booking.plan?.finalPrice || 0);
    if (priceWithGst > 0) {
      basePrice = (priceWithGst / 1.18) / years;
    }
  }

  // Calculate Listed Price with 10% / 15% duration rules
  let listedPrice = basePrice * years;
  if (years === 2) {
    listedPrice = basePrice * 2 * 0.9;
  } else if (years >= 3) {
    // 3 years or more
    listedPrice = basePrice * years * 0.85;
  }

  const discountAmount = Number(booking.plan?.discount || 0);
  const customerPays = Math.max(0, listedPrice - discountAmount);

  // Partner Price from DB (already multiplied by tenure in checkout)
  let partnerPrice = getPartnerBaseAmount(booking);

  // If partnerPrice is 0 (missing), we fall back to 15% of customerPays (legacy)
  if (partnerPrice > 0) {
    const commission = Math.max(0, customerPays - partnerPrice);
    return toMoney(Math.max(500, commission));
  }

  return toMoney(Math.max(500, customerPays * LEGACY_COMMISSION_RATE));
};
