import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Package, RefreshCw, ArrowRight } from 'lucide-react';
import { services } from '@/data/products';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const iconMap: { [key: string]: React.ElementType } = {
  Wrench,
  Package,
  RefreshCw,
  Truck: Package,
};

export default function Services() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.services-title',
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

      gsap.fromTo(
        '.service-card',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.services-grid',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white py-9 lg:py-12">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="mb-6 text-center">
          <h2 className="services-title mb-2 font-display text-2xl font-black text-dh-primary sm:text-3xl">
            Our <span className="text-dh-secondary">Services</span>
          </h2>
          <p className="services-title mx-auto max-w-xl text-sm leading-6 text-dh-dark-gray sm:text-base">
            More than just a store - we're your tech partner
          </p>
        </div>

        {/* Services Grid */}
        <div className="services-grid grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {services.slice(0, 3).map((service) => {
            const Icon = iconMap[service.icon] || Package;
            return (
              <Link
                key={service.id}
                to={service.link}
                className="service-card group relative overflow-hidden rounded-2xl bg-dh-gray p-4 transition-all duration-500 hover:bg-dh-primary sm:p-5"
              >
                {/* Background Decoration */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-dh-secondary/10 rounded-full group-hover:bg-white/10 transition-colors" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-dh-primary/5 rounded-full group-hover:bg-white/5 transition-colors" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-dh-primary transition-colors group-hover:bg-dh-secondary sm:h-14 sm:w-14">
                    <Icon className="h-6 w-6 text-white transition-colors group-hover:text-dh-primary sm:h-7 sm:w-7" />
                  </div>

                  {/* Text */}
                  <h3 className="mb-2 font-display text-lg font-black text-dh-primary transition-colors group-hover:text-white">
                    {service.title}
                  </h3>
                  <p className="mb-4 text-sm leading-6 text-dh-dark-gray transition-colors group-hover:text-white/80">
                    {service.description}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center text-dh-primary group-hover:text-dh-secondary font-medium transition-colors">
                    <span>Learn More</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-dh-primary to-[#3a3aa8] p-5 sm:p-6 lg:flex-row">
          <div className="text-center lg:text-left">
            <h3 className="font-display font-bold text-2xl lg:text-3xl text-white mb-2">
              Need Help with Your Device?
            </h3>
            <p className="text-white/80">
              Our expert technicians are ready to fix your gadgets
            </p>
          </div>
          <Link to="/services/repair">
            <Button
              size="lg"
              className="bg-dh-secondary text-dh-black hover:bg-white rounded-full px-8 font-semibold"
            >
              Book a Repair
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
