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
    <section ref={sectionRef} className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="services-title font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-dh-primary mb-4">
            Our <span className="text-dh-secondary">Services</span>
          </h2>
          <p className="services-title text-lg text-dh-dark-gray max-w-xl mx-auto">
            More than just a store - we're your tech partner
          </p>
        </div>

        {/* Services Grid */}
        <div className="services-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.slice(0, 3).map((service) => {
            const Icon = iconMap[service.icon] || Package;
            return (
              <Link
                key={service.id}
                to={service.link}
                className="service-card group relative bg-dh-gray rounded-2xl p-6 lg:p-8 hover:bg-dh-primary transition-all duration-500 overflow-hidden"
              >
                {/* Background Decoration */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-dh-secondary/10 rounded-full group-hover:bg-white/10 transition-colors" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-dh-primary/5 rounded-full group-hover:bg-white/5 transition-colors" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-dh-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-dh-secondary transition-colors">
                    <Icon className="w-8 h-8 text-white group-hover:text-dh-primary transition-colors" />
                  </div>

                  {/* Text */}
                  <h3 className="font-display font-semibold text-xl text-dh-primary group-hover:text-white mb-3 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-dh-dark-gray group-hover:text-white/80 mb-6 transition-colors">
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
        <div className="mt-12 bg-gradient-to-r from-dh-primary to-[#3a3aa8] rounded-2xl p-6 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6">
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
