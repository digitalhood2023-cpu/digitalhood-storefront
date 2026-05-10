import SEOContent from './SEOContent';

export default function LaptopPage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Buy Laptops in Zambia - HP, Dell, MacBook & More</h2>
        <p className="text-gray-700 mb-4">
          Looking for a laptop in Zambia? DigitalHood offers a wide range of laptops from top brands including 
          HP, Dell, Lenovo, Asus, Acer, and Apple MacBook. Whether you need a laptop for work, school, gaming, 
          or personal use, we have the perfect option for you at the best prices in Lusaka.
        </p>
        <p className="text-gray-700 mb-4">
          All laptops come with manufacturer warranty and our quality guarantee. We offer free delivery on 
          orders over K500 and flexible payment options. Visit our store or shop online today.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Laptop Categories</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Business Laptops</h4>
            <p className="text-gray-600 text-sm">HP EliteBook, Dell Latitude, Lenovo ThinkPad. Professional-grade for work.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Gaming Laptops</h4>
            <p className="text-gray-600 text-sm">Asus ROG, Acer Predator, HP Omen. High-performance gaming machines.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Student Laptops</h4>
            <p className="text-gray-600 text-sm">Affordable options for students. Chromebooks and entry-level Windows laptops.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Apple MacBook</h4>
            <p className="text-gray-600 text-sm">MacBook Air and MacBook Pro with M1, M2, and M3 chips.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Ultrabooks</h4>
            <p className="text-gray-600 text-sm">Thin and light laptops for professionals on the go.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">2-in-1 Laptops</h4>
            <p className="text-gray-600 text-sm">Convertible laptops with touchscreens. Laptop and tablet in one.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Laptop Accessories</h3>
        <p className="text-gray-700 mb-4">
          Complete your setup with our range of laptop accessories including bags, mice, keyboards, 
          monitors, docking stations, and more. Everything you need for a productive workspace.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Laptop Repair Services</h3>
        <p className="text-gray-700 mb-4">
          We also offer professional laptop repair services including screen replacement, keyboard repair, 
          battery replacement, and software troubleshooting. Our certified technicians can fix all major brands.
        </p>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I buy laptops in Lusaka?",
      a: "DigitalHood is one of the best laptop dealers in Lusaka. We offer a wide selection of laptops from HP, Dell, Lenovo, Asus, and Apple at competitive prices."
    },
    {
      q: "How much is a laptop in Zambia?",
      a: "Laptop prices at DigitalHood start from K4,999 for entry-level models. Business laptops range from K8,000 to K20,000. Gaming laptops start from K15,000."
    },
    {
      q: "Do you sell MacBook in Zambia?",
      a: "Yes, we are an authorized Apple reseller in Zambia. We sell MacBook Air and MacBook Pro with official Apple warranty."
    },
    {
      q: "Do you offer laptop repair in Zambia?",
      a: "Yes, we provide professional laptop repair services in Lusaka. We fix screens, keyboards, batteries, and software issues for all major brands."
    },
  ];

  return (
    <SEOContent
      title="Buy Laptops in Zambia - HP, Dell, MacBook, Best Prices"
      description="Buy laptops in Zambia at DigitalHood. HP, Dell, Lenovo, Asus, MacBook & more. Best prices, warranty, free delivery. Shop online or visit our Lusaka store!"
      keywords={[
        'laptops Zambia',
        'buy laptop Lusaka',
        'HP laptop Zambia',
        'Dell laptop Zambia',
        'MacBook Zambia',
        'laptop price Zambia',
        'Lenovo laptop Zambia',
        'gaming laptop Zambia'
      ]}
      categoryFilter="Laptops"
      content={content}
      faqs={faqs}
    />
  );
}
