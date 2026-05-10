import SEOContent from './SEOContent';

export default function HeadphonesPage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Buy Headphones & Earbuds in Zambia - Best Prices</h2>
        <p className="text-gray-700 mb-4">
          Looking for quality headphones in Zambia? DigitalHood offers a wide selection of wireless headphones, 
          earbuds, and gaming headsets from top brands like Apple, Sony, Samsung, JBL, Bose, and Marshall. 
          Find the perfect audio gear for music, work, or gaming.
        </p>
        <p className="text-gray-700 mb-4">
          All our headphones are 100% genuine with manufacturer warranty. Enjoy free delivery on orders over K500 
          and flexible payment options including mobile money.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Headphone Types</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Wireless Earbuds</h4>
            <p className="text-gray-600 text-sm">AirPods, Galaxy Buds, Sony WF series. True wireless freedom.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Over-Ear Headphones</h4>
            <p className="text-gray-600 text-sm">Sony WH-1000XM5, Bose QC45. Premium noise cancellation.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">On-Ear Headphones</h4>
            <p className="text-gray-600 text-sm">Marshall, Beats. Stylish and portable.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Gaming Headsets</h4>
            <p className="text-gray-600 text-sm">Razer, HyperX, SteelSeries. Immersive gaming audio.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Sports Earbuds</h4>
            <p className="text-gray-600 text-sm">JBL, Beats Fit Pro. Sweat-resistant for workouts.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Wired Headphones</h4>
            <p className="text-gray-600 text-sm">Studio monitors and audiophile options.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Top Brands Available</h3>
        <p className="text-gray-700 mb-4">
          We stock headphones from Apple, Sony, Samsung, JBL, Bose, Marshall, Beats, Sennheiser, 
          Audio-Technica, Razer, and more. All products are genuine with warranty.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Features to Consider</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Active Noise Cancellation (ANC)</strong> - Block out ambient noise</li>
          <li><strong>Transparency Mode</strong> - Hear your surroundings when needed</li>
          <li><strong>Battery Life</strong> - From 5 hours to 50+ hours</li>
          <li><strong>Water Resistance</strong> - IPX4 and above for sports</li>
          <li><strong>Multipoint Connection</strong> - Connect to multiple devices</li>
        </ul>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I buy AirPods in Zambia?",
      a: "DigitalHood sells genuine AirPods in Zambia including AirPods Pro 2, AirPods 3, and AirPods Max. All come with official Apple warranty."
    },
    {
      q: "How much are AirPods in Zambia?",
      a: "AirPods prices at DigitalHood: AirPods 2 from K1,899, AirPods 3 from K2,499, AirPods Pro 2 from K2,899, AirPods Max from K7,999."
    },
    {
      q: "Do you sell Sony headphones in Zambia?",
      a: "Yes, we stock Sony headphones including the WH-1000XM5, WH-CH720N, and WF-1000XM5 earbuds at competitive prices."
    },
    {
      q: "What are the best wireless earbuds in Zambia?",
      a: "Popular options include AirPods Pro 2, Samsung Galaxy Buds3 Pro, Sony WF-1000XM5, and JBL Tune series. Visit our store to compare."
    },
  ];

  return (
    <SEOContent
      title="Buy Headphones & Earbuds Zambia - AirPods, Sony, Best Prices"
      description="Buy headphones in Zambia at DigitalHood. AirPods, Sony, Samsung, JBL & more. Wireless earbuds, gaming headsets, ANC headphones. Free delivery over K500!"
      keywords={[
        'headphones Zambia',
        'AirPods Zambia',
        'wireless earbuds Zambia',
        'Sony headphones Zambia',
        'buy headphones Lusaka',
        'earbuds price Zambia',
        'Bluetooth headphones Zambia',
        'gaming headset Zambia'
      ]}
      categoryFilter="Audio"
      content={content}
      faqs={faqs}
    />
  );
}
