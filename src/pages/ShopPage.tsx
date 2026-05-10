import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Filter, 
  Grid3X3, 
  List, 
  Heart,
  ShoppingCart,
  Star,
  Check,
  X,
  SlidersHorizontal,
  Trash2,
  Search
} from 'lucide-react';
import { products, categories, brands, priceRanges, conditions, ratingOptions } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type SortOption = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest' | 'best-selling';

export default function ShopPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  
  // Enhanced Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.shop-content',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // Get active filters count
  const activeFiltersCount = [
    selectedCategories.length,
    selectedBrands.length,
    selectedConditions.length,
    selectedShipping.length,
    selectedRating ? 1 : 0,
    inStockOnly ? 1 : 0,
    onSaleOnly ? 1 : 0,
    priceRange[0] > 0 || priceRange[1] < 50000 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      // Category filter
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(product.category)) return false;
      }
      
      // Brand filter
      if (selectedBrands.length > 0) {
        if (!selectedBrands.some(brand => product.name.includes(brand))) return false;
      }
      
      // Price filter
      if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
      
      // Rating filter
      if (selectedRating && product.rating < selectedRating) return false;
      
      // In stock filter
      if (inStockOnly && !product.inStock) return false;
      
      // On sale filter
      if (onSaleOnly && !product.originalPrice) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          (product.sku && product.sku.toLowerCase().includes(query))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return b.id.localeCompare(a.id);
        case 'best-selling':
          return b.reviews - a.reviews;
        default:
          return 0;
      }
    });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    );
  };

  const handleConditionToggle = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  const handleAddToCart = (product: typeof products[0]) => {
    addToCart(product);
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  const formatPrice = (price: number) => `K${price.toLocaleString()}`;

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, 50000]);
    setSelectedRating(null);
    setSelectedConditions([]);
    setSelectedShipping([]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSearchQuery('');
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl lg:text-3xl text-black mb-4">
              Shop All Products
            </h1>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <Button
                variant="outline"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden relative"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#ffb54a] text-black text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Active Filters Pills */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-sm text-gray-500">Active filters:</span>
                {selectedCategories.map(cat => (
                  <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                    {cat}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => handleCategoryToggle(cat)} />
                  </Badge>
                ))}
                {selectedBrands.map(brand => (
                  <Badge key={brand} variant="secondary" className="flex items-center gap-1">
                    {brand}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => handleBrandToggle(brand)} />
                  </Badge>
                ))}
                {selectedRating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {selectedRating}★ & above
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedRating(null)} />
                  </Badge>
                )}
                {inStockOnly && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    In Stock
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setInStockOnly(false)} />
                  </Badge>
                )}
                {onSaleOnly && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    On Sale
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setOnSaleOnly(false)} />
                  </Badge>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="shop-content flex gap-8">
            {/* Sidebar Filters */}
            <aside className={`${isFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0`}>
              <div className="bg-white rounded-2xl p-6 sticky top-24 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Filters
                  </h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <Accordion type="multiple" defaultValue={['categories', 'price']} className="space-y-2">
                  {/* Categories */}
                  <AccordionItem value="categories" className="border-b">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="font-medium">Categories</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {categories.slice(0, 15).map((category) => (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <Checkbox
                              checked={selectedCategories.includes(category.name)}
                              onCheckedChange={() => handleCategoryToggle(category.name)}
                            />
                            <span className="text-sm text-gray-700 flex-1">{category.name}</span>
                            <span className="text-xs text-gray-400">({category.productCount})</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Price Range */}
                  <AccordionItem value="price" className="border-b">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="font-medium">Price Range</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <Slider
                          value={priceRange}
                          onValueChange={(value) => setPriceRange(value as [number, number])}
                          max={50000}
                          step={100}
                        />
                        <div className="flex items-center justify-between text-sm">
                          <span className="bg-gray-100 px-3 py-1 rounded">{formatPrice(priceRange[0])}</span>
                          <span className="text-gray-400">to</span>
                          <span className="bg-gray-100 px-3 py-1 rounded">{formatPrice(priceRange[1])}</span>
                        </div>
                        <div className="space-y-1">
                          {priceRanges.map((range) => (
                            <button
                              key={range.label}
                              onClick={() => setPriceRange([range.min, range.max])}
                              className="block w-full text-left text-sm text-gray-600 hover:text-black hover:bg-gray-50 px-2 py-1 rounded"
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Brands */}
                  <AccordionItem value="brands" className="border-b">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="font-medium">Brands</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {brands.map((brand) => (
                          <label
                            key={brand}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <Checkbox
                              checked={selectedBrands.includes(brand)}
                              onCheckedChange={() => handleBrandToggle(brand)}
                            />
                            <span className="text-sm text-gray-700">{brand}</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Rating */}
                  <AccordionItem value="rating" className="border-b">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="font-medium">Customer Rating</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {ratingOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <Checkbox
                              checked={selectedRating === option.value}
                              onCheckedChange={() => setSelectedRating(
                                selectedRating === option.value ? null : option.value
                              )}
                            />
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < option.value
                                      ? 'fill-[#ffb54a] text-[#ffb54a]'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">& Up</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Condition */}
                  <AccordionItem value="condition" className="border-b">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="font-medium">Condition</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {conditions.map((condition) => (
                          <label
                            key={condition.value}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <Checkbox
                              checked={selectedConditions.includes(condition.value)}
                              onCheckedChange={() => handleConditionToggle(condition.value)}
                            />
                            <span className="text-sm text-gray-700">{condition.label}</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Availability */}
                  <AccordionItem value="availability" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="font-medium">Availability</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <Checkbox
                            checked={inStockOnly}
                            onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
                          />
                          <span className="text-sm text-gray-700">In Stock Only</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <Checkbox
                            checked={onSaleOnly}
                            onCheckedChange={(checked) => setOnSaleOnly(checked as boolean)}
                          />
                          <span className="text-sm text-gray-700">On Sale</span>
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Close Filter Button (Mobile) */}
                <Button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full lg:hidden mt-6"
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close Filters
                </Button>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <p className="text-gray-600 text-sm">
                  Showing <span className="font-semibold text-black">{filteredProducts.length}</span> products
                </p>
                
                <div className="flex items-center gap-4">
                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                    >
                      <option value="featured">Featured</option>
                      <option value="best-selling">Best Selling</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                      <option value="newest">Newest Arrivals</option>
                    </select>
                  </div>

                  {/* View Mode */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-2">No products found</h3>
                  <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <div className={`grid ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'grid-cols-1 gap-4'
                }`}>
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
                        viewMode === 'list' ? 'flex' : ''
                      }`}
                    >
                      {/* Image */}
                      <div className={`relative overflow-hidden bg-gray-100 ${
                        viewMode === 'list' ? 'w-48 shrink-0' : 'aspect-square'
                      }`}>
                        <Link to={`/product/${product.id}`}>
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </Link>
                        
                        {product.badge && (
                          <Badge className="absolute top-2 left-2 bg-[#ffb54a] text-black font-semibold text-xs">
                            {product.badge}
                          </Badge>
                        )}

                        {/* Quick Actions */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleWishlist(product)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                              isInWishlist(product.id)
                                ? 'bg-red-500 text-white'
                                : 'bg-white text-gray-600 hover:text-red-500'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="w-4 h-4 fill-[#ffb54a] text-[#ffb54a]" />
                          <span className="text-sm font-medium">{product.rating}</span>
                          <span className="text-sm text-gray-400">({product.reviews})</span>
                        </div>

                        <Link to={`/product/${product.id}`}>
                          <h3 className="font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2">
                            {product.name}
                          </h3>
                        </Link>

                        <p className="text-sm text-gray-500 mb-2">{product.category}</p>

                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-display font-bold text-lg">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice(product.originalPrice)}
                            </span>
                          )}
                        </div>

                        <Button
                          onClick={() => handleAddToCart(product)}
                          className={`w-full transition-all ${
                            addedToCart === product.id
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                          } text-white`}
                          size="sm"
                        >
                          {addedToCart === product.id ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Added
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add to Cart
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
