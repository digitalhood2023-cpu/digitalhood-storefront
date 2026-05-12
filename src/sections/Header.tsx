import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { navCategories } from '@/data/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartButton } from '@/features/cart/CartButton';
import { CartDrawer } from '@/features/cart/CartDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const categorySlugMap: Record<string, string> = {
  smartphones: 'smartphones',
  phones: 'smartphones',
  laptops: 'laptops-computers',
  'laptops-computers': 'laptops-computers',
  tablets: 'tablets-e-readers',
  'tablets-e-readers': 'tablets-e-readers',
  audio: 'audio-headphones',
  'audio-headphones': 'audio-headphones',
  cameras: 'cameras-photography',
  'cameras-photography': 'cameras-photography',
  tv: 'tv-home-theater',
  'tv-home-theater': 'tv-home-theater',
  'phone-accessories': 'phone-accessories',
  accessories: 'phone-accessories',
  'computer-accessories': 'computer-accessories',
  deals: 'deals',
};

function getShopCategoryUrl(slug: string) {
  const mappedSlug = categorySlugMap[slug] || slug;
  return `/shop?category=${mappedSlug}`;
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { items: wishlistItems } = useWishlist();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setIsScrolled(currentScrollY > 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
      setSearchQuery('');
    }
  };

  return (
    <>
      <div className="bg-black text-white py-2 text-sm hidden md:block">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#ffb54a]" />
              +260 971 047 570
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#ffb54a]" />
              Free delivery on orders over K500
            </span>
            <span className="flex items-center gap-2 text-[#ffb54a]">
              <Clock className="w-4 h-4" />
              Fixing Tomorrow Today
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/help" className="hover:text-[#ffb54a] transition-colors">
              Help
            </Link>
            <Link to="/track-order" className="hover:text-[#ffb54a] transition-colors">
              Track Order
            </Link>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'glass-effect shadow-lg py-2' : 'bg-white py-4'
        } ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="DigitalHood"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="hidden sm:block">
                <div className="font-display font-bold text-2xl text-black leading-tight">
                  Digital<span className="text-[#ffb54a]">Hood</span>
                </div>
                <div className="text-xs text-gray-500 tracking-wider">
                  FIXING TOMORROW TODAY
                </div>
              </div>
            </Link>

            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search for products, brands, categories..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-4 pr-12 py-3 rounded-full border-2 border-gray-200 focus:border-black transition-colors"
                />

                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black rounded-full flex items-center justify-center text-white hover:bg-[#ffb54a] hover:text-black transition-colors"
                  aria-label="Search products"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 hover:bg-gray-100">
                    Categories
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                  {navCategories.map((cat) => (
                    <DropdownMenuItem key={cat.slug} asChild>
                      <Link to={getShopCategoryUrl(cat.slug)} className="cursor-pointer">
                        {cat.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
                  <Heart className="w-5 h-5" />
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ffb54a] text-black text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                      {wishlistItems.length}
                    </span>
                  )}
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/account">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/wishlist">Wishlist</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/login">Sign In</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <CartButton onClick={() => setIsCartOpen(true)} />
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>

              <CartButton onClick={() => setIsCartOpen(true)} />

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isSearchOpen && (
            <div className="mt-4 md:hidden animate-slide-up">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pr-12"
                />

                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  aria-label="Search products"
                >
                  <Search className="w-5 h-5 text-black" />
                </button>
              </form>
            </div>
          )}
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t animate-slide-up">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col gap-2">
                <Link to="/" className="py-3 px-4 hover:bg-gray-100 rounded-lg transition-colors">
                  Home
                </Link>

                <Link to="/shop" className="py-3 px-4 hover:bg-gray-100 rounded-lg transition-colors">
                  Shop
                </Link>

                <div className="py-2 px-4">
                  <span className="text-sm text-gray-500 mb-2 block">Categories</span>

                  <div className="flex flex-col gap-1 pl-4">
                    {navCategories.slice(0, 8).map((cat) => (
                      <Link
                        key={cat.slug}
                        to={getShopCategoryUrl(cat.slug)}
                        className="py-2 px-4 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link to="/shop?category=deals" className="py-3 px-4 hover:bg-gray-100 rounded-lg transition-colors">
                  Deals
                </Link>

                <Link to="/account" className="py-3 px-4 hover:bg-gray-100 rounded-lg transition-colors">
                  My Account
                </Link>

                <Link
                  to="/wishlist"
                  className="py-3 px-4 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between"
                >
                  Wishlist
                  {wishlistItems.length > 0 && (
                    <span className="bg-[#ffb54a] text-black text-xs font-bold px-2 py-1 rounded-full">
                      {wishlistItems.length}
                    </span>
                  )}
                </Link>
              </nav>
            </div>
          </div>
        )}
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}