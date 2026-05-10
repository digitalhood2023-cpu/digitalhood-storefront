import SEOContent from './SEOContent';

export default function SamsungPage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Buy Samsung Phones in Zambia - Galaxy S24, A55 & More</h2>
        <p className="text-gray-700 mb-4">
          Looking for Samsung phones in Zambia? DigitalHood offers the latest Samsung Galaxy smartphones at the 
          best prices in Lusaka and nationwide. From the flagship Galaxy S24 Ultra to the budget-friendly A series, 
          we have the perfect Samsung phone for you.
        </p>
        <p className="text-gray-700 mb-4">
          All Samsung phones come with official Samsung warranty and our quality guarantee. Enjoy free delivery 
          on orders over K500 and flexible payment options including mobile money.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Samsung Galaxy Series Available</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Galaxy S24 Series</h4>
            <p className="text-gray-600 text-sm">S24, S24+, and S24 Ultra with Galaxy AI. Experience the future of smartphones.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Galaxy A55 5G</h4>
            <p className="text-gray-600 text-sm">Premium mid-range with 5G, 4 years of updates, and amazing camera.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Galaxy A35 & A25</h4>
            <p className="text-gray-600 text-sm">Affordable smartphones with great features and long battery life.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Samsung Accessories</h3>
        <p className="text-gray-700 mb-4">
          Complete your Samsung experience with our range of accessories including Galaxy Buds, Galaxy Watch, 
          fast chargers, wireless chargers, cases, and screen protectors. All genuine Samsung products.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Trade-In Program</h3>
        <p className="text-gray-700 mb-4">
          Upgrade to a new Samsung phone with our trade-in program. Get the best value for your old phone 
          and save on your new Samsung device. We accept all major brands for trade-in.
        </p>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I buy Samsung phones in Zambia?",
      a: "DigitalHood is a leading Samsung retailer in Zambia. We offer the latest Galaxy phones at competitive prices with official Samsung warranty."
    },
    {
      q: "How much is Samsung Galaxy S24 in Zambia?",
      a: "Samsung Galaxy S24 prices start from K14,999 at DigitalHood. The S24 Ultra starts from K18,999. Contact us for current promotions and trade-in offers."
    },
    {
      q: "Do you sell Samsung Galaxy A55 in Zambia?",
      a: "Yes, we stock the Samsung Galaxy A55 5G at DigitalHood. It's one of our best-selling mid-range phones with excellent value for money."
    },
    {
      q: "Can I trade in my old phone for a Samsung?",
      a: "Yes, we offer trade-in services for all phone brands. Bring your old phone to our store or contact us for a trade-in valuation."
    },
  ];

  return (
    <SEOContent
      title="Buy Samsung Phones Zambia - Galaxy S24, A55, Best Prices"
      description="Buy Samsung phones in Zambia at DigitalHood. Galaxy S24, A55, A35 & more. Best prices, official warranty, free delivery. Shop online or call +260 971 047 570!"
      keywords={[
        'Samsung phones Zambia',
        'Samsung Galaxy Zambia',
        'Galaxy S24 Zambia',
        'Galaxy A55 Zambia',
        'Samsung price Zambia',
        'buy Samsung Lusaka',
        'Samsung dealer Zambia',
        'Samsung smartphone Zambia'
      ]}
      categoryFilter="Smartphones"
      content={content}
      faqs={faqs}
    />
  );
}
