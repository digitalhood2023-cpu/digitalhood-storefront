import SEOContent from './SEOContent';

export default function PowerBankPage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Buy Power Banks in Zambia - Portable Chargers</h2>
        <p className="text-gray-700 mb-4">
          Never run out of battery again! DigitalHood offers a wide range of power banks and portable chargers 
          in Zambia. From compact 5000mAh power banks for everyday use to high-capacity 30000mAh units for 
          extended trips, we have the perfect portable power solution for you.
        </p>
        <p className="text-gray-700 mb-4">
          All our power banks are from trusted brands like Anker, Xiaomi, Samsung, and Romoss. Enjoy free 
          delivery on orders over K500 and quality guarantee on all products.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Power Bank Capacities</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">5000mAh - 10000mAh</h4>
            <p className="text-gray-600 text-sm">Compact and lightweight. Perfect for daily use and pocket carry.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">10000mAh - 20000mAh</h4>
            <p className="text-gray-600 text-sm">Most popular range. 2-4 full phone charges. Great value.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">20000mAh - 30000mAh</h4>
            <p className="text-gray-600 text-sm">High capacity for multiple devices. Perfect for travel.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Fast Charging</h4>
            <p className="text-gray-600 text-sm">Power Delivery (PD) and Quick Charge support. Charge faster.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Wireless Power Banks</h4>
            <p className="text-gray-600 text-sm">Qi wireless charging. No cables needed for compatible phones.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Solar Power Banks</h4>
            <p className="text-gray-600 text-sm">Charge using sunlight. Perfect for outdoor adventures.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Top Power Bank Brands</h3>
        <p className="text-gray-700 mb-4">
          We stock power banks from Anker, Xiaomi, Samsung, Romoss, Baseus, and more. All products are 
          genuine with warranty and safety certifications.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">How to Choose a Power Bank</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Capacity</strong> - Choose based on your device's battery size</li>
          <li><strong>Output Power</strong> - Higher wattage = faster charging</li>
          <li><strong>Number of Ports</strong> - Charge multiple devices simultaneously</li>
          <li><strong>Portability</strong> - Consider size and weight for your needs</li>
          <li><strong>Safety Features</strong> - Overcharge, overheat, and short-circuit protection</li>
        </ul>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I buy power banks in Zambia?",
      a: "DigitalHood sells a wide range of power banks in Zambia. We offer various capacities from top brands like Anker, Xiaomi, and Romoss at competitive prices."
    },
    {
      q: "How much is a power bank in Zambia?",
      a: "Power bank prices at DigitalHood start from K299 for 5000mAh models. Popular 10000mAh power banks range from K499 to K899. High-capacity 20000mAh+ models start from K999."
    },
    {
      q: "What is the best power bank brand?",
      a: "Anker is widely regarded as the best power bank brand due to reliability, safety features, and build quality. We also recommend Xiaomi and Samsung for excellent performance."
    },
    {
      q: "Can I bring a power bank on a plane in Zambia?",
      a: "Yes, power banks up to 100Wh (approximately 27000mAh) can be carried in hand luggage. Larger capacity power banks may require airline approval."
    },
  ];

  return (
    <SEOContent
      title="Buy Power Banks in Zambia - Portable Chargers | Best Prices"
      description="Buy power banks in Zambia at DigitalHood. 10000mAh, 20000mAh, fast charging & wireless options. Anker, Xiaomi, Samsung. Free delivery over K500!"
      keywords={[
        'power bank Zambia',
        'portable charger Zambia',
        'power bank price Zambia',
        'Anker power bank Zambia',
        'buy power bank Lusaka',
        '20000mAh power bank Zambia',
        'fast charging power bank',
        'wireless power bank Zambia'
      ]}
      categoryFilter="Power Banks"
      content={content}
      faqs={faqs}
    />
  );
}
