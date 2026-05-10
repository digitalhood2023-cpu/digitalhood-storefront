import SEOContent from './SEOContent';

export default function IPhonePage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Buy iPhone in Zambia - Best Prices at DigitalHood</h2>
        <p className="text-gray-700 mb-4">
          Looking to buy an iPhone in Zambia? DigitalHood is the authorized reseller of Apple iPhones in Zambia, 
          offering the latest iPhone 15 series, iPhone 14, iPhone 13, and more at the best prices in Lusaka and 
          across the country.
        </p>
        <p className="text-gray-700 mb-4">
          All our iPhones are 100% genuine with official Apple warranty. We offer flexible payment options including 
          mobile money, bank transfer, and cash on delivery. Free delivery available on orders over K500.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">iPhone Models Available</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">iPhone 15 Series</h4>
            <p className="text-gray-600 text-sm">iPhone 15, 15 Plus, 15 Pro, and 15 Pro Max. Latest A17 Pro chip and titanium design.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">iPhone 14 Series</h4>
            <p className="text-gray-600 text-sm">iPhone 14, 14 Plus, 14 Pro, and 14 Pro Max. Dynamic Island and 48MP camera.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">iPhone 13 Series</h4>
            <p className="text-gray-600 text-sm">iPhone 13, 13 mini, 13 Pro, and 13 Pro Max. Great value for money.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Why Buy iPhone from DigitalHood?</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>100% genuine Apple products with official warranty</li>
          <li>Best iPhone prices in Zambia</li>
          <li>Free delivery on orders over K500</li>
          <li>Trade-in options available for old devices</li>
          <li>Expert support and after-sales service</li>
          <li>Flexible payment options including mobile money</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">iPhone Accessories</h3>
        <p className="text-gray-700 mb-4">
          Complete your iPhone purchase with our wide range of accessories including MagSafe cases, AirPods, 
          Apple Watch, fast chargers, and more. Everything you need to get the most out of your iPhone.
        </p>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I buy original iPhone in Zambia?",
      a: "DigitalHood is an authorized Apple reseller in Zambia. We sell 100% genuine iPhones with official Apple warranty at the best prices."
    },
    {
      q: "How much is iPhone 15 in Zambia?",
      a: "iPhone 15 prices at DigitalHood start from K12,999 for the base model. iPhone 15 Pro Max starts from K21,999. Contact us for current promotions."
    },
    {
      q: "Do you offer iPhone warranty in Zambia?",
      a: "Yes, all iPhones purchased from DigitalHood come with official Apple warranty. We also provide local support for warranty claims."
    },
    {
      q: "Can I pay for iPhone using mobile money?",
      a: "Yes, we accept MTN Mobile Money, Airtel Money, and Zamtel Money for iPhone purchases. You can also pay by bank transfer or cash on delivery."
    },
  ];

  return (
    <SEOContent
      title="Buy iPhone in Zambia - iPhone 15, 14, 13 | Best Prices"
      description="Buy original iPhone in Zambia at DigitalHood. iPhone 15, 14, 13 series available. Best prices, official warranty, free delivery. Shop now or call +260 971 047 570!"
      keywords={[
        'buy iPhone Zambia',
        'iPhone price Zambia',
        'iPhone Lusaka',
        'iPhone 15 Zambia',
        'iPhone 14 Zambia',
        'original iPhone Zambia',
        'Apple iPhone Zambia',
        'cheap iPhone Zambia'
      ]}
      categoryFilter="Smartphones"
      content={content}
      faqs={faqs}
    />
  );
}
