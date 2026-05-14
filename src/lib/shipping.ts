export function isLusakaLocation(city = '', province = '') {
  return (
    city.trim().toLowerCase().includes('lusaka') ||
    province.trim().toLowerCase().includes('lusaka')
  );
}

export function getShippingDetails({
  subtotal,
  city = 'Lusaka',
  province = 'Lusaka',
}: {
  subtotal: number;
  city?: string;
  province?: string;
}) {
  const isLusaka = isLusakaLocation(city, province);
  const isBeforeSameDayCutoff = new Date().getHours() < 16;

  const fee = subtotal >= 499 ? 0 : isLusaka ? 30 : 50;

  const title =
    subtotal >= 499
      ? 'Free Shipping'
      : isLusaka
        ? 'Lusaka Delivery'
        : 'Outside Lusaka Delivery';

  const estimate =
    isLusaka && isBeforeSameDayCutoff
      ? 'Same-day delivery available'
      : isLusaka
        ? 'Next-day delivery'
        : '1–2 days delivery outside Lusaka';

  const cutoffHour = 16;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(cutoffHour, 0, 0, 0);

  const minutesLeft = Math.max(
    0,
    Math.floor((cutoff.getTime() - now.getTime()) / 60000)
  );

  const countdown =
    minutesLeft > 0
      ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left for same-day Lusaka delivery`
      : 'Same-day delivery cutoff has passed';

  return {
    fee,
    title,
    estimate,
    isLusaka,
    isBeforeSameDayCutoff,
    countdown,
  };
}
