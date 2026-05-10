import SEOContent from './SEOContent';

export default function PhoneAccessoriesPage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Buy Phone Accessories in Zambia - Best Prices at DigitalHood</h2>
        <p className="text-gray-700 mb-4">
          Looking for quality phone accessories in Zambia? DigitalHood is your one-stop shop for all mobile phone accessories 
          in Lusaka and across Zambia. We stock a wide range of phone cases, screen protectors, chargers, cables, and more 
          at the most competitive prices.
        </p>
        <p className="text-gray-700 mb-4">
          Whether you need an iPhone case, Samsung charger, or universal phone accessories, we have everything you need 
          to protect and enhance your mobile device. All our products come with warranty and free delivery on orders over K500.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Our Phone Accessories Collection</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Phone Cases & Covers</h4>
            <p className="text-gray-600 text-sm">Protective cases for iPhone, Samsung, Xiaomi, and all major brands. Silicone, leather, and rugged options available.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Screen Protectors</h4>
            <p className="text-gray-600 text-sm">Tempered glass and film protectors for all phone models. Keep your screen scratch-free.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Chargers & Cables</h4>
            <p className="text-gray-600 text-sm">Fast chargers, wireless chargers, USB-C, Lightning, and Micro USB cables.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Power Banks</h4>
            <p className="text-gray-600 text-sm">Portable chargers from 5000mAh to 30000mAh capacity. Never run out of battery.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Popular Brands We Stock</h3>
        <p className="text-gray-700 mb-4">
          We carry phone accessories from all major brands including Apple, Samsung, Anker, Belkin, Spigen, 
          OtterBox, and many more. All products are 100% genuine with manufacturer warranty.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Delivery Across Zambia</h3>
        <p className="text-gray-700">
          We deliver phone accessories to all major cities in Zambia including Lusaka, Kitwe, Ndola, Livingstone, 
          Chipata, and more. Free delivery on orders over K500. Same-day delivery available in Lusaka.
        </p>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I buy phone accessories in Lusaka?",
      a: "DigitalHood is the best place to buy phone accessories in Lusaka. We offer a wide selection, competitive prices, and fast delivery. You can shop online or visit our store."
    },
    {
      q: "Do you sell original iPhone accessories?",
      a: "Yes, we sell 100% genuine Apple accessories including iPhone cases, chargers, AirPods, and more. All products come with official Apple warranty."
    },
    {
      q: "How much is delivery for phone accessories in Zambia?",
      a: "We offer free delivery on all orders over K500 across Zambia. For orders below K500, delivery fees start from K50 depending on your location."
    },
    {
      q: "Do you have Samsung phone accessories?",
      a: "Yes, we stock a wide range of Samsung accessories including cases for Galaxy S and A series, fast chargers, wireless chargers, and more."
    },
  ];

  return (
    <SEOContent
      title="Phone Accessories Zambia - Cases, Chargers, Screen Protectors"
      description="Buy phone accessories in Zambia at DigitalHood. Shop cases, chargers, screen protectors, power banks & more. Free delivery on orders over K500. Best prices guaranteed!"
      keywords={[
        'phone accessories Zambia',
        'phone accessories Lusaka',
        'iPhone accessories Zambia',
        'Samsung accessories Zambia',
        'phone cases Zambia',
        'screen protectors Zambia',
        'phone chargers Zambia',
        'power banks Zambia'
      ]}
      categoryFilter="Phone Accessories"
      content={content}
      faqs={faqs}
    />
  );
}
