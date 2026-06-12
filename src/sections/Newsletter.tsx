import { useState, useEffect, useRef } from 'react';
import { Send, Check, Gift, Tag, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Newsletter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.newsletter-content',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
      }, 3000);
    }
  };

  const benefits = [
    { icon: Gift, text: 'Exclusive Deals' },
    { icon: Tag, text: 'Early Access to Sales' },
    { icon: Bell, text: 'New Arrival Alerts' },
  ];

  return (
    <section ref={sectionRef} className="bg-dh-gray py-9 lg:py-12">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="newsletter-content relative overflow-hidden rounded-2xl bg-dh-primary p-5 sm:p-6 lg:p-8">
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-dh-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />

          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)] lg:gap-8">
            {/* Left Content */}
            <div>
              <h2 className="mb-3 font-display text-2xl font-black text-white sm:text-3xl">
                Subscribe for <span className="text-dh-secondary">Exclusive Deals</span>
              </h2>
              <p className="mb-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Join our newsletter and be the first to know about new products, sales, and special offers.
              </p>

              {/* Benefits */}
              <div className="flex flex-wrap gap-2">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"
                  >
                    <benefit.icon className="w-4 h-4 text-dh-secondary" />
                    <span className="text-white text-sm">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitted}
                    className="h-12 w-full rounded-full border-2 border-white/20 bg-white/10 pl-5 pr-32 text-white placeholder:text-white/50 transition-all focus:border-dh-secondary focus:bg-white/20"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitted}
                    className={`absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-full px-4 text-sm font-bold transition-all ${
                      isSubmitted
                        ? 'bg-green-500 hover:bg-green-500'
                        : 'bg-dh-secondary text-dh-black hover:bg-white'
                    }`}
                  >
                    {isSubmitted ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Subscribed
                      </>
                    ) : (
                      <>
                        Subscribe
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-white/50 text-sm text-center lg:text-left">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>

              {/* Stats */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="font-display text-xl font-black text-dh-secondary lg:text-2xl">10K+</p>
                  <p className="text-white/60 text-sm">Subscribers</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-xl font-black text-dh-secondary lg:text-2xl">500+</p>
                  <p className="text-white/60 text-sm">Products</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-xl font-black text-dh-secondary lg:text-2xl">50+</p>
                  <p className="text-white/60 text-sm">Brands</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
