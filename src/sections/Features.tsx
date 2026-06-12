import { useEffect, useRef } from 'react';
import { Truck, Shield, CreditCard, Headphones } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Truck,
    title: 'Free Delivery',
    description: 'On orders over K500 across Zambia',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Quality Guarantee',
    description: '100% authentic products or money back',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: CreditCard,
    title: 'Secure Payment',
    description: 'Multiple safe payment options',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Always here to help you',
    color: 'from-orange-500 to-orange-600',
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        '.features-title',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Connector line animation
      gsap.fromTo(
        '.connector-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.features-grid',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Feature cards animation
      gsap.fromTo(
        '.feature-card',
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.2,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: '.features-grid',
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-br from-dh-primary via-dh-primary to-[#1a1a6a] py-9 lg:py-12">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="mb-6 text-center">
          <h2 className="features-title mb-2 font-display text-2xl font-black text-white sm:text-3xl">
            Why Choose <span className="text-dh-secondary">DigitalHood</span>
          </h2>
          <p className="features-title mx-auto max-w-xl text-sm leading-6 text-white/70 sm:text-base">
            We go the extra mile to ensure you get the best shopping experience
          </p>
        </div>

        {/* Features Grid */}
        <div className="features-grid relative">
          {/* Connector Line (desktop only) */}
          <div className="connector-line hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-white/20 via-dh-secondary/50 to-white/20 origin-left" />

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card group rounded-2xl bg-white/8 p-4 text-center ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 sm:p-5"
              >
                {/* Icon */}
                <div className="relative mb-4 inline-block">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16`}>
                    <feature.icon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                  </div>
                  {/* Step Number */}
                  <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-dh-secondary text-xs font-black text-dh-primary">
                    {index + 1}
                  </div>
                </div>

                {/* Content */}
                <h3 className="mb-1 font-display text-lg font-black text-white transition-colors group-hover:text-dh-secondary">
                  {feature.title}
                </h3>
                <p className="text-sm leading-6 text-white/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
