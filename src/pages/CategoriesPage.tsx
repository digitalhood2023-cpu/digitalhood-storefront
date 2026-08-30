import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  CircleAlert,
  Grid3X3,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { fetchWooCategories, type WooCategory } from '@/lib/woocommerce'
import {
  getCategoryVisual,
  sortCategoriesForMarketplace,
} from '@/lib/categoryIntelligence'
import {
  resolveMarketplaceDepartments,
  type ResolvedMarketplaceDepartment,
} from '@/lib/marketplaceCategoryDirectory'

const ALL_DEPARTMENTS = 'all'

function getCategoryUrl(category: WooCategory) {
  return `/category/${encodeURIComponent(category.slug)}`
}

function DepartmentSelector({
  department,
  active,
  onSelect,
}: {
  department: ResolvedMarketplaceDepartment
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex min-w-max items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition lg:w-full lg:min-w-0 ${
        active
          ? 'border-[#28256d] bg-[#28256d] text-white shadow-sm'
          : 'border-transparent bg-white text-slate-600 hover:border-[#28256d]/20 hover:bg-[#f7f6ff]'
      }`}
      aria-pressed={active}
    >
      <span className="truncate text-xs font-black">{department.name}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
          active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {department.productCount.toLocaleString('en-ZM')}
      </span>
    </button>
  )
}

function CategoryRow({ category, index }: { category: WooCategory; index: number }) {
  const visual = getCategoryVisual(category, index)

  return (
    <Link
      to={getCategoryUrl(category)}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-[#ffb54a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#28256d]"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
        <img
          src={visual.image}
          alt=""
          className="h-full w-full object-contain p-1"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-[13px] font-black leading-4 text-[#17155f]">
          {category.name}
        </h2>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
          {category.productCount.toLocaleString('en-ZM')} product
          {category.productCount === 1 ? '' : 's'}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#a76500]" />
    </Link>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<WooCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState(ALL_DEPARTMENTS)

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetchWooCategories()
        if (cancelled) return

        setCategories(
          sortCategoriesForMarketplace(
            response.filter(
              (category) =>
                category.productCount > 0 && category.slug !== 'categorizes'
            )
          )
        )
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'We could not load marketplace categories.'
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  const departments = useMemo(
    () =>
      resolveMarketplaceDepartments(categories).filter(
        (department) => department.available
      ),
    [categories]
  )

  const activeDepartment = useMemo(
    () => departments.find((item) => item.slug === selectedDepartment),
    [departments, selectedDepartment]
  )

  const visibleCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const base = query
      ? categories
      : activeDepartment?.categories?.length
        ? activeDepartment.categories
        : categories

    if (!query) return base

    return base.filter((category) =>
      [category.name, category.slug, category.description]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [activeDepartment, categories, searchQuery])

  const popularCategories = categories.slice(0, 8)
  const visibleHeading = searchQuery.trim()
    ? `Results for “${searchQuery.trim()}”`
    : activeDepartment?.name || 'All categories'
  const visibleDescription = searchQuery.trim()
    ? 'Matching categories from across the marketplace.'
    : activeDepartment?.description ||
      'Every live DigitalHood category in one compact directory.'

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#f6f7fb]">
      <SEO
        title="Shop by Category | DigitalHood Marketplace Zambia"
        description="Find phones, computers, accessories, charging, audio, gaming, repairs and more in the DigitalHood marketplace category directory."
        path="/categories"
      />

      <Header />

      <main className="flex-1 pb-8 pt-3 sm:pt-4">
        <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5 lg:px-8 xl:px-12">
          <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Link to="/" className="hover:text-[#28256d]">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#28256d]">Categories</span>
          </nav>

          <section className="mt-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0efff] text-[#28256d]">
                  <Grid3X3 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-xl font-black text-[#17155f] sm:text-2xl">
                      Shop by category
                    </h1>
                    {!isLoading && (
                      <span className="rounded-full bg-[#ffead0] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#8a5200]">
                        {categories.length} live
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Find the right product without digging through long menus.
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 gap-2 lg:w-[520px]">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search categories</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search categories"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-[#fafbfc] pl-9 pr-9 text-xs font-semibold text-[#17155f] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#28256d] focus:bg-white focus:ring-2 focus:ring-[#28256d]/10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Clear category search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>

                <Link
                  to="/shop"
                  className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-[#17155f] px-3 text-[11px] font-black text-white transition hover:bg-[#28256d]"
                >
                  Shop all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {!isLoading && !loadError && popularCategories.length > 0 && (
            <section className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <span className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#a76500]">
                <Sparkles className="h-3.5 w-3.5" /> Popular
              </span>
              {popularCategories.map((category) => (
                <Link
                  key={category.slug}
                  to={getCategoryUrl(category)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600 transition hover:border-[#ffb54a] hover:text-[#17155f]"
                >
                  {category.name}
                  <span className="text-[9px] text-slate-400">{category.productCount}</span>
                </Link>
              ))}
            </section>
          )}

          {isLoading ? (
            <section className="mt-3 grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
              <div className="hidden h-[430px] animate-pulse rounded-2xl bg-white lg:block" />
              <div className="rounded-2xl bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="h-[78px] animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              </div>
            </section>
          ) : loadError ? (
            <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <CircleAlert className="h-5 w-5" />
              <p className="mt-2 text-sm font-black">Categories are reconnecting</p>
              <p className="mt-1 text-xs leading-5">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-black shadow-sm"
              >
                Try again
              </button>
            </section>
          ) : (
            <section className="mt-3 grid items-start gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
              <aside className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm [scrollbar-width:none] lg:sticky lg:top-3 lg:overflow-visible">
                <div className="flex gap-1.5 lg:flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDepartment(ALL_DEPARTMENTS)
                      setSearchQuery('')
                    }}
                    className={`flex min-w-max items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition lg:w-full lg:min-w-0 ${
                      selectedDepartment === ALL_DEPARTMENTS && !searchQuery
                        ? 'border-[#28256d] bg-[#28256d] text-white shadow-sm'
                        : 'border-transparent bg-white text-slate-600 hover:border-[#28256d]/20 hover:bg-[#f7f6ff]'
                    }`}
                    aria-pressed={selectedDepartment === ALL_DEPARTMENTS && !searchQuery}
                  >
                    <span className="text-xs font-black">All categories</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                      selectedDepartment === ALL_DEPARTMENTS && !searchQuery
                        ? 'bg-white/15 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {categories.length}
                    </span>
                  </button>

                  {departments.map((department) => (
                    <DepartmentSelector
                      key={department.slug}
                      department={department}
                      active={!searchQuery && selectedDepartment === department.slug}
                      onSelect={() => {
                        setSelectedDepartment(department.slug)
                        setSearchQuery('')
                      }}
                    />
                  ))}
                </div>
              </aside>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-end justify-between gap-3 border-b border-slate-100 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-base font-black text-[#17155f] sm:text-lg">
                      {visibleHeading}
                    </h2>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                      {visibleDescription}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {visibleCategories.length} categor{visibleCategories.length === 1 ? 'y' : 'ies'}
                  </span>
                </header>

                {visibleCategories.length > 0 ? (
                  <div className="grid gap-2 p-2.5 sm:grid-cols-2 sm:p-3 xl:grid-cols-3">
                    {visibleCategories.map((category, index) => (
                      <CategoryRow key={category.slug} category={category} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                    <Search className="h-7 w-7 text-[#28256d]" />
                    <p className="mt-3 font-display text-lg font-black text-[#17155f]">
                      No matching category yet
                    </p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                      Try a shorter name or browse every live marketplace category.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedDepartment(ALL_DEPARTMENTS)
                      }}
                      className="mt-4 rounded-xl bg-[#17155f] px-4 py-2 text-xs font-black text-white"
                    >
                      Show all categories
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
