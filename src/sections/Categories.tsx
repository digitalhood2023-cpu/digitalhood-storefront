import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { categories } from '@/data/products';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const categorySlugMap: Record<string, string> = {
  smartphones: 'smartphones',
  phones: 'smartphones',
  laptops: 'laptops-computers',
  'laptops-computers': 'laptops-computers',
  accessories: 'phone-accessories',
  services: 'services',
  tablets: 'tablets-e-readers',
  audio: 'audio-headphones',
  cameras: 'cameras-photography',
  tv: 'tv-home-theater',
  deals: 'deals',
};

function getShopCategoryUrl(slug: string) {
  const mappedSlug = categorySlugMap[slug] || slug;
  return `/shop?category=${mappedSlug}`;
}

export default function Categories() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.category-title',
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
        '.category-card',
        { rotateY: -30, opacity: 0, transformOrigin: 'center center' },
        {
          rotateY: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: cardsRef.current,
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
        <div className="text-center mb-12">
          <h2 className="category-title font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-dh-primary mb-4">
            Shop by Category
          </h2>
          <p className="category-title text-lg text-dh-dark-gray max-w-xl mx-auto">
            Find exactly what you need from our wide range of trusted products
          </p>
        </div>

        <div
          ref={cardsRef}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ perspective: '1000px' }}
        >
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={getShopCategoryUrl(category.slug)}
              className="category-card group relative overflow-hidden rounded-2xl bg-dh-gray hover:shadow-card-hover transition-all duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotate(${index % 2 === 0 ? '-1' : '1'}deg)`,
              }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={category.image || '/logo.jpg'}
                  alt={category.name}
                  onError={(event) => {
                    event.currentTarget.src = '/logo.jpg';
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-dh-primary/80 via-dh-primary/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-dh-primary">
                    {category.productCount} items
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display font-semibold text-xl text-dh-primary mb-2 group-hover:text-dh-secondary transition-colors">
                  {category.name}
                </h3>

                <p className="text-sm text-dh-dark-gray mb-4">
                  {category.description}
                </p>

                <div className="flex items-center text-dh-primary font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Explore</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="absolute inset-0 border-2 border-transparent group-hover:border-dh-secondary rounded-2xl transition-colors duration-300 pointer-events-none" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

