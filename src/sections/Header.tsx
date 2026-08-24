import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgePercent,
  Headphones,
  Home,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  Phone,
  MapPin,
  Clock,
  PackageCheck,
  LogOut,
  UserPlus,
  ShoppingBag,
  Store,
  MessageCircle,
  LayoutGrid,
} from 'lucide-react'

import { useWishlist } from '@/context/WishlistContext'
import { useAccount } from '@/context/AccountContext'
import {
  fetchWooCategories,
  type WooCategory,
} from '@/lib/woocommerce'
import { sortCategoriesForMarketplace } from '@/lib/categoryIntelligence'
import { Button } from '@/components/ui/button'
import { CartButton } from '@/features/cart/CartButton'
import { CartDrawer } from '@/features/cart/CartDrawer'
import { useBackButtonDismiss } from '@/hooks/useBackButtonDismiss'
import WishlistDrawer from '@/components/wishlist/WishlistDrawer'
import SearchAutocomplete from '@/components/search/SearchAutocomplete'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function getShopCategoryUrl(slug: string) {
  return `/category/${encodeURIComponent(slug)}`
}

function getCustomerDisplayName(customer: {
  firstName?: string
  lastName?: string
  email?: string
} | null) {
  if (!customer) return ''

  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim()

  return fullName || customer.email || 'Customer'
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [menuCategories, setMenuCategories] = useState<WooCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function loadMenuCategories() {
      setCategoriesLoading(true)

      try {
        const categories = await fetchWooCategories()

        if (cancelled) return

        setMenuCategories(
          sortCategoriesForMarketplace(
            categories.filter(
              (category) =>
                category.productCount > 0 &&
                category.slug !== 'categorizes'
            )
          ).slice(0, 20)
        )
      } catch (error) {
        console.error('[Header] Unable to load marketplace categories:', error)

        if (!cancelled) setMenuCategories([])
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    }

    loadMenuCategories()

    return () => {
      cancelled = true
    }
  }, [])

  const { items: wishlistItems, openWishlistDrawer } = useWishlist()
  const { customer, isAuthenticated, logout } = useAccount()

  const customerDisplayName = getCustomerDisplayName(customer)

  useEffect(() => {
    if (!isAuthenticated) {
      setMessageUnreadCount(0)
      return
    }

    let cancelled = false
    let activeSocket:
      ReturnType<
        (
          typeof import('@/api/chat')
        )['createBuyerChatSocket']
      > | null = null

    const chatModulePromise =
      import('@/api/chat')

    async function refreshUnreadCount() {
      try {
        const {
          getBuyerInbox
        } =
          await chatModulePromise

        const response =
          await getBuyerInbox(100)

        if (cancelled) {
          return
        }

        const unread =
          response.conversations.reduce(
            (total, conversation) =>
              total +
              Math.max(
                0,
                conversation.unreadCount || 0
              ),
            0
          )

        setMessageUnreadCount(
          unread
        )
      } catch {
        if (!cancelled) {
          setMessageUnreadCount(0)
        }
      }
    }

    const handleUnreadRefresh =
      () => {
        void refreshUnreadCount()
      }

    async function connectUnreadSocket() {
      try {
        const {
          createBuyerChatSocket
        } =
          await chatModulePromise

        if (cancelled) {
          return
        }

        const nextSocket =
          createBuyerChatSocket()

        activeSocket =
          nextSocket

        nextSocket.on(
          'conversation:changed',
          handleUnreadRefresh
        )

        nextSocket.on(
          'connect',
          handleUnreadRefresh
        )

        if (!nextSocket.connected) {
          nextSocket.connect()
        }
      } catch {
        activeSocket = null
      }
    }

    void refreshUnreadCount()
    void connectUnreadSocket()

    window.addEventListener(
      'digitalhood:chat-unread-refresh',
      handleUnreadRefresh
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        'digitalhood:chat-unread-refresh',
        handleUnreadRefresh
      )

      if (activeSocket) {
        activeSocket.off(
          'conversation:changed',
          handleUnreadRefresh
        )

        activeSocket.off(
          'connect',
          handleUnreadRefresh
        )

        activeSocket.disconnect()
      }
    }
  }, [isAuthenticated])

  const { dismiss: dismissMobileMenu } = useBackButtonDismiss({
    id: 'mobile-menu',
    isOpen: isMobileMenuOpen,
    onDismiss: () => setIsMobileMenuOpen(false),
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 32)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      if (isMobileMenuOpen) {
        event.preventDefault()
        dismissMobileMenu()
      }

      if (isCartOpen) {
        event.preventDefault()
        setIsCartOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => document.removeEventListener('keydown', handleEscape)
  }, [dismissMobileMenu, isCartOpen, isMobileMenuOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      <div className="sticky left-0 right-0 top-0 z-[100]">
        <div className="hidden bg-black py-1.5 text-xs text-white md:block">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#ffb54a]" />
              +260971047570
            </span>

            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#ffb54a]" />
              contact@digitalhood.info
            </span>

            <span className="flex items-center gap-2 text-[#ffb54a]">
              <Clock className="h-4 w-4" />
              Fixing Tomorrow Today
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <span className="hidden text-white/80 lg:inline">
                Hi, {customerDisplayName}
              </span>
            )}

            <Link to="/contact" className="transition-colors hover:text-[#ffb54a]">
              Help
            </Link>

            <Link
              to="/track-order"
              className="transition-colors hover:text-[#ffb54a]"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>

        <header
          className={`border-b border-dh-light-gray transition-all duration-300 ${
            isScrolled ? 'glass-effect py-2 shadow-lg' : 'bg-white py-2.5 sm:py-3'
          }`}
        >
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex min-w-0 items-center justify-between gap-2 xl:gap-4">
            <Link to="/" className="group flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11">
                <img
                  src="/logo.jpg"
                  alt="DigitalHood"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="hidden sm:block">
                <div className="font-display text-xl font-bold leading-tight text-black">
                  Digital<span className="text-[#ffb54a]">Hood</span>
                </div>

                <div className="text-xs tracking-wider text-gray-500">
                  FIXING TOMORROW TODAY
                </div>
              </div>
            </Link>

            <div className="mx-3 hidden min-w-0 max-w-2xl flex-1 lg:block xl:mx-6">
                <SearchAutocomplete className="mx-auto max-w-2xl" />
              </div>

            <div className="hidden shrink-0 items-center gap-1 md:flex lg:gap-2">
              <Link
                  to="/shops"
                  className="hidden items-center rounded-full px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100 xl:inline-flex"
                >
                  Shops
                </Link>

              <Link
                to="/categories"
                className="hidden items-center rounded-full px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100 xl:inline-flex"
              >
                Categories
              </Link>

              <Link
                to="/collections/deals"
                className="hidden items-center rounded-full px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100 xl:inline-flex"
              >
                Deals
              </Link>

              <a
                href="https://seller.digitalhood.info"
                className="hidden items-center rounded-full bg-dh-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ffb54a] hover:text-black xl:inline-flex"
              >
                Sell
              </a>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 hover:bg-gray-100"
                  >
                    Categories
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="max-h-80 w-56 overflow-y-auto"
                >
                  {categoriesLoading ? (
                    <DropdownMenuItem disabled>
                      Loading categories...
                    </DropdownMenuItem>
                  ) : menuCategories.length > 0 ? (
                    menuCategories.map((cat) => (
                      <DropdownMenuItem key={cat.slug} asChild>
                        <Link
                          to={getShopCategoryUrl(cat.slug)}
                          className="cursor-pointer"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {cat.name}
                          </span>
                          <span className="ml-3 text-xs text-gray-400">
                            {cat.productCount}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/categories" className="cursor-pointer">
                        Browse all categories
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to="/track-order"
                className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100 xl:inline-flex"
              >
                <PackageCheck className="h-4 w-4 text-[#ffb54a]" />
                Track Order
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openWishlistDrawer}
                className="relative hover:bg-gray-100"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />

                {wishlistItems.length > 0 && (
                  <span className="animate-scale-in absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffb54a] text-xs font-bold text-black">
                    {wishlistItems.length}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-gray-100"
                    aria-label="Account"
                  >
                    <User className="h-5 w-5" />

                    {isAuthenticated && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-60">
                  {isAuthenticated ? (
                    <>
                      <div className="border-b border-gray-100 px-3 py-3">
                        <p className="text-sm font-semibold text-dh-primary">
                          {customerDisplayName}
                        </p>

                        <p className="truncate text-xs text-dh-dark-gray">
                          {customer?.email}
                        </p>
                      </div>

                      <DropdownMenuItem asChild>
                        <Link to="/account" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          My Account
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link to="/orders" className="cursor-pointer">
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          My Orders
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          to="/account/messages"
                          className="flex cursor-pointer items-center justify-between gap-3"
                        >
                          <span className="flex items-center">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Messages
                          </span>

                          {messageUnreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffb54a] px-1.5 text-[10px] font-black text-[#26248c]">
                              {messageUnreadCount > 99
                                ? '99+'
                                : messageUnreadCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link to="/track-order" className="cursor-pointer">
                          <PackageCheck className="mr-2 h-4 w-4" />
                          Track Order
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={openWishlistDrawer}
                        className="cursor-pointer"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        Wishlist
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/login" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Sign in
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link to="/register" className="cursor-pointer">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create account
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link to="/track-order" className="cursor-pointer">
                          <PackageCheck className="mr-2 h-4 w-4" />
                          Track Order
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={openWishlistDrawer}
                        className="cursor-pointer"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        Wishlist
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <CartButton onClick={() => setIsCartOpen(true)} />
            </div>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 md:hidden">
              <Link
                to="/track-order"
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Track order"
              >
                <PackageCheck className="h-5 w-5" />
              </Link>

              <Link
                to={isAuthenticated ? '/account' : '/login'}
                className="relative rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Account"
              >
                <User className="h-5 w-5" />

                {isAuthenticated && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                )}
              </Link>

              <CartButton onClick={() => setIsCartOpen(true)} />

              <button
                onClick={() => (isMobileMenuOpen ? dismissMobileMenu() : setIsMobileMenuOpen(true))}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Open menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="relative z-[120] mt-2 lg:hidden">
            <SearchAutocomplete compact placeholder="Search products, shops and categories..." />
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="animate-slide-up absolute inset-x-0 top-full max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain border-t bg-white shadow-2xl md:hidden">
            <div className="mx-auto w-full max-w-2xl px-3 py-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a76500]">Quick access</p>
                  <p className="font-display text-lg font-black text-dh-primary">Browse DigitalHood</p>
                </div>
                <button type="button" onClick={dismissMobileMenu} className="rounded-full bg-dh-gray p-2" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="grid grid-cols-2 gap-2">
                {isAuthenticated && (
                  <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-[#16145f] p-3 text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><User className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {customerDisplayName}
                    </p>
                    <p className="truncate text-xs text-white/60">
                      {customer?.email}
                    </p>
                    </div>
                  </div>
                )}

                <Link
                  to="/"
                  className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                >
                  <Home className="h-4 w-4" /> Home
                </Link>

                <Link
                  to="/shops"
                  className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                >
                  <Store className="h-4 w-4" /> Shops
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      to="/account"
                      className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                    >
                      <User className="h-4 w-4" /> Account
                    </Link>

                    <Link
                      to="/orders"
                      className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                    >
                      <ShoppingBag className="h-4 w-4" /> Orders
                    </Link>

                    <Link
                      to="/account/messages"
                      className="flex items-center justify-between gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                    >
                      <span className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Messages
                      </span>

                      {messageUnreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffb54a] px-1.5 text-[10px] font-black text-[#26248c]">
                          {messageUnreadCount > 99
                            ? '99+'
                            : messageUnreadCount}
                        </span>
                      )}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                    >
                      <User className="h-4 w-4" /> Sign in
                    </Link>

                    <Link
                      to="/register"
                      className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                    >
                      <UserPlus className="h-4 w-4" /> Join
                    </Link>
                  </>
                )}

                <Link
                  to="/track-order"
                  className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                >
                  <PackageCheck className="h-4 w-4 text-[#ffb54a]" />
                  Track order
                </Link>

                <Link
                  to="/categories"
                  className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                >
                  <LayoutGrid className="h-4 w-4" /> Categories
                </Link>

                <div className="col-span-2 mt-1 rounded-2xl border border-gray-100 p-2.5">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-black uppercase tracking-wide text-gray-500">Popular categories</span>
                    <Link to="/categories" className="text-xs font-bold text-[#26248c]">View all</Link>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {categoriesLoading ? (
                      <span className="col-span-2 px-2 py-3 text-sm text-gray-400">
                        Loading categories...
                      </span>
                    ) : menuCategories.length > 0 ? (
                      menuCategories.slice(0, 8).map((cat) => (
                        <Link
                          key={cat.slug}
                          to={getShopCategoryUrl(cat.slug)}
                          className="flex min-w-0 items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2 text-xs font-semibold transition hover:bg-gray-100"
                        >
                          <span className="truncate">{cat.name}</span>
                          <span className="ml-2 text-[10px] text-gray-400">
                            {cat.productCount}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <Link
                        to="/categories"
                        className="col-span-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-gray-100"
                      >
                        Browse all categories
                      </Link>
                    )}
                  </div>
                </div>

                <Link
                  to="/collections/deals"
                  className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20"
                >
                  <BadgePercent className="h-4 w-4" /> Deals
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    openWishlistDrawer()
                  }}
                  className="flex items-center justify-between rounded-xl bg-dh-gray px-3 py-2.5 text-left font-bold transition hover:bg-dh-secondary/20"
                >
                  <span className="flex items-center gap-2"><Heart className="h-4 w-4" /> Wishlist</span>

                  {wishlistItems.length > 0 && (
                    <span className="rounded-full bg-[#ffb54a] px-2 py-1 text-xs font-bold text-black">
                      {wishlistItems.length}
                    </span>
                  )}
                </button>

                <Link to="/contact" className="flex items-center gap-2 rounded-xl bg-dh-gray px-3 py-2.5 font-bold transition hover:bg-dh-secondary/20">
                  <Headphones className="h-4 w-4" /> Support
                </Link>

                <a href="https://seller.digitalhood.info" className="flex items-center gap-2 rounded-xl bg-[#16145f] px-3 py-2.5 font-bold text-white transition hover:bg-[#26248c]">
                  <Store className="h-4 w-4 text-[#ffb54a]" /> Sell with us
                </a>

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                )}
              </nav>
            </div>
          </div>
        )}
        </header>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <WishlistDrawer />
    </>
  )
}
