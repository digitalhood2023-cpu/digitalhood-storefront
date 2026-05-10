import { useEffect, useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { testimonials } from '@/data/products';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.testimonials-title',
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
        '.testimonial-carousel',
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [activeIndex]);

  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const goToPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = ((diff + testimonials.length) % testimonials.length);
    
    if (normalizedDiff === 0) {
      // Active card
      return {
        transform: 'translateX(0) scale(1) rotateY(0deg)',
        opacity: 1,
        zIndex: 10,
        filter: 'blur(0px)',
      };
    } else if (normalizedDiff === 1 || normalizedDiff === -testimonials.length + 1) {
      // Next card
      return {
        transform: 'translateX(80%) scale(0.85) rotateY(-25deg)',
        opacity: 0.6,
        zIndex: 5,
        filter: 'blur(2px)',
      };
    } else if (normalizedDiff === testimonials.length - 1 || normalizedDiff === -1) {
      // Previous card
      return {
        transform: 'translateX(-80%) scale(0.85) rotateY(25deg)',
        opacity: 0.6,
        zIndex: 5,
        filter: 'blur(2px)',
      };
    } else {
      // Hidden cards
      return {
        transform: 'translateX(0) scale(0.7)',
        opacity: 0,
        zIndex: 0,
        filter: 'blur(4px)',
      };
    }
  };

  return (
    <section ref={sectionRef} className="py-16 lg:py-24 bg-dh-gray overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="testimonials-title font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-dh-primary mb-4">
            What Our <span className="text-gradient">Customers Say</span>
          </h2>
          <p className="testimonials-title text-lg text-dh-dark-gray max-w-xl mx-auto">
            Real reviews from real customers across Zambia
          </p>
        </div>

        {/* 3D Carousel */}
        <div
          className="testimonial-carousel relative max-w-4xl mx-auto"
          style={{ perspective: '1200px' }}
        >
          <div className="relative h-[400px] sm:h-[350px]" style={{ transformStyle: 'preserve-3d' }}>
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className="absolute inset-0 transition-all duration-800 ease-out"
                style={{
                  ...getCardStyle(index),
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="bg-white rounded-3xl shadow-card-hover p-8 h-full flex flex-col items-center text-center">
                  {/* Quote Icon */}
                  <div className="w-12 h-12 bg-dh-secondary/20 rounded-full flex items-center justify-center mb-6">
                    <Quote className="w-6 h-6 text-dh-secondary" />
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < testimonial.rating
                            ? 'fill-dh-secondary text-dh-secondary'
                            : 'text-dh-light-gray'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-lg text-dh-dark-gray mb-8 flex-1 line-clamp-3">
                    "{testimonial.text}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-dh-secondary"
                    />
                    <div className="text-left">
                      <h4 className="font-semibold text-dh-primary">{testimonial.name}</h4>
                      <p className="text-sm text-dh-dark-gray">{testimonial.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrev}
              className="rounded-full border-2 border-dh-primary hover:bg-dh-primary hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!isAnimating) {
                      setIsAnimating(true);
                      setActiveIndex(index);
                      setTimeout(() => setIsAnimating(false), 800);
                    }
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeIndex
                      ? 'bg-dh-primary w-8'
                      : 'bg-dh-light-gray hover:bg-dh-primary/50'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="rounded-full border-2 border-dh-primary hover:bg-dh-primary hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
