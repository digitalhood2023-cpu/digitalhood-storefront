import SEOContent from './SEOContent';

export default function ScreenRepairPage() {
  const content = (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-black mb-4">Phone Screen Repair in Zambia - Fast & Affordable</h2>
        <p className="text-gray-700 mb-4">
          Cracked your phone screen? DigitalHood offers professional phone screen repair services in Lusaka 
          and across Zambia. Our certified technicians can fix screens for iPhone, Samsung, Huawei, Xiaomi, 
          and all major brands quickly and affordably.
        </p>
        <p className="text-gray-700 mb-4">
          We use high-quality replacement screens that match or exceed original specifications. Most repairs 
          are completed within 1-2 hours. All screen replacements come with warranty for your peace of mind.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Screen Repair Services</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">iPhone Screen Repair</h4>
            <p className="text-gray-600 text-sm">iPhone 6 to iPhone 15 Pro Max. OLED and LCD replacement available.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Samsung Screen Repair</h4>
            <p className="text-gray-600 text-sm">Galaxy S series, A series, Note series. AMOLED replacement.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Huawei Screen Repair</h4>
            <p className="text-gray-600 text-sm">P series, Mate series, Nova series. Original quality screens.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Xiaomi Screen Repair</h4>
            <p className="text-gray-600 text-sm">Mi series, Redmi series, Poco series. Fast turnaround.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Other Brands</h4>
            <p className="text-gray-600 text-sm">Oppo, Vivo, Nokia, Infinix, Tecno, and more.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-black mb-2">Tablet Screen Repair</h4>
            <p className="text-gray-600 text-sm">iPad, Samsung Galaxy Tab, Huawei MatePad screens.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Our Repair Process</h3>
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">1</div>
            <h4 className="font-semibold text-black mb-1">Diagnosis</h4>
            <p className="text-gray-600 text-sm">Free assessment of your device</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">2</div>
            <h4 className="font-semibold text-black mb-1">Quote</h4>
            <p className="text-gray-600 text-sm">Transparent pricing provided</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">3</div>
            <h4 className="font-semibold text-black mb-1">Repair</h4>
            <p className="text-gray-600 text-sm">Expert repair in 1-2 hours</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">4</div>
            <h4 className="font-semibold text-black mb-1">Warranty</h4>
            <p className="text-gray-600 text-sm">Covered by our guarantee</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Why Choose DigitalHood for Screen Repair?</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Certified technicians with years of experience</li>
          <li>High-quality replacement screens</li>
          <li>Fast turnaround - most repairs in 1-2 hours</li>
          <li>Warranty on all screen replacements</li>
          <li>Competitive pricing</li>
          <li>Original and OEM quality options available</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-black mb-3">Screen Replacement Parts Available</h3>
        <p className="text-gray-700 mb-4">
          We also sell screen replacement parts for DIY repairs. Choose from original, OEM, and high-quality 
          aftermarket screens. Contact us for availability and pricing for your specific model.
        </p>
      </section>
    </div>
  );

  const faqs = [
    {
      q: "Where can I fix my phone screen in Lusaka?",
      a: "DigitalHood offers professional phone screen repair services in Lusaka. Our certified technicians can fix screens for all major brands including iPhone, Samsung, and Huawei."
    },
    {
      q: "How much does it cost to replace a phone screen in Zambia?",
      a: "Screen replacement prices vary by model. iPhone screens start from K1,500, Samsung from K1,200. Contact us for a quote for your specific device."
    },
    {
      q: "How long does screen repair take?",
      a: "Most screen repairs are completed within 1-2 hours. Complex repairs may take longer. We offer same-day service for most common models."
    },
    {
      q: "Do you offer warranty on screen repairs?",
      a: "Yes, all our screen replacements come with warranty. Original screens have longer warranty periods. Contact us for specific warranty details."
    },
    {
      q: "Can I buy screen replacement parts?",
      a: "Yes, we sell screen replacement parts for DIY repairs. We stock screens for iPhone, Samsung, Huawei, Xiaomi, and other popular brands."
    },
  ];

  return (
    <SEOContent
      title="Phone Screen Repair Zambia - iPhone, Samsung | Fast Service"
      description="Phone screen repair in Zambia at DigitalHood. iPhone, Samsung, Huawei screen replacement. Fast 1-2 hour service, warranty included. Call +260 971 047 570!"
      keywords={[
        'phone screen repair Zambia',
        'screen replacement Lusaka',
        'iPhone screen repair Zambia',
        'Samsung screen repair Zambia',
        'phone repair Zambia',
        'fix phone screen Lusaka',
        'cracked screen repair Zambia',
        'phone repair shop Zambia'
      ]}
      categoryFilter="Screen Replacement"
      content={content}
      faqs={faqs}
    />
  );
}
