import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  Clock3,
  Grid3X3,
  Search,
  Sparkles,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fetchWooCategories, type WooCategory } from '@/lib/woocommerce'
import {
  resolveMarketplaceDepartments,
  type ResolvedMarketplaceDepartment,
} from '@/lib/marketplaceCategoryDirectory'

function DepartmentCard({
  department,
}: {
  department: ResolvedMarketplaceDepartment
}) {
  const content = (
    <div
      className={`group h-full rounded-3xl border p-5 transition-all ${
        department.available
          ? 'border-gray-100 bg-white shadow-sm hover:-translate-y-1 hover:border-dh-secondary hover:shadow-lg'
          : 'border-dashed border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
          {department.available ? (
            <Boxes className="h-6 w-6" />
          ) : (
            <Clock3 className="h-6 w-6" />
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            department.available
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {department.available
            ? `${department.productCount.toLocaleString('en-ZM')} items`
            : 'Coming soon'}
        </span>
      </div>

      <h2 className="mt-5 font-display text-xl font-black text-dh-primary">
        {department.name}
      </h2>

      <p className="mt-2 min-h-[48px] text-sm leading-6 text-gray-500">
        {department.description}
      </p>

      {department.available ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {department.categories.slice(0, 4).map((category) => (
              <span
                key={category.slug}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
              >
                {category.name}
              </span>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center text-sm font-black text-dh-primary">
            Browse department
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </>
      ) : (
        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-400">
          Marketplace expansion category
        </p>
      )}
    </div>
  )

  if (!department.available) {
    return content
  }

  return (
    <Link to={department.url} className="block h-full">
      {content}
    </Link>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<WooCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetchWooCategories()

        if (!cancelled) {
          setCategories(
            response.filter(
              (category) =>
                category.productCount > 0 &&
                category.slug !== 'categorizes'
            )
          )
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'We could not load marketplace categories.'
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  const departments = useMemo(
    () => resolveMarketplaceDepartments(categories),
    [categories]
  )

  const filteredDepartments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return departments

    return departments.filter((department) =>
      [
        department.name,
        department.description,
        ...department.keywords,
        ...department.categories.map((category) => category.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [departments, searchQuery])

  const availableCount = departments.filter(
    (department) => department.available
  ).length

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Technology Departments | DigitalHood Marketplace Zambia"
        description="Browse DigitalHood technology departments covering phones, laptops, accessories, charging, gaming, audio, repairs, office equipment and future marketplace categories."
        path="/categories"
      />

      <Header />

      <main className="pb-12 pt-5">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav className="mb-5 flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-bold text-dh-primary">Categories</span>
          </nav>

          <section className="overflow-hidden rounded-3xl bg-dh-primary px-5 py-8 text-white shadow-sm sm:px-8 lg:px-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-dh-secondary">
                  <Sparkles className="h-4 w-4" />
                  DigitalHood technology directory
                </div>

                <h1 className="mt-5 max-w-4xl font-display text-3xl font-black sm:text-4xl lg:text-5xl">
                  Browse technology by department
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
                  Current products are grouped into clean departments while
                  future marketplace categories remain visible as DigitalHood
                  expands.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 px-5 py-4">
                  <p className="text-3xl font-black text-dh-secondary">
                    {availableCount}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Active departments
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4">
                  <p className="text-3xl font-black text-dh-secondary">
                    {categories.length}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Live categories
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search departments such as laptops, gaming, chargers or repair..."
                  className="h-12 rounded-full pl-12"
                />
              </div>

              <div className="flex gap-2">
                {searchQuery && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="rounded-full"
                  >
                    Clear
                  </Button>
                )}

                <Link to="/shop">
                  <Button className="rounded-full bg-dh-primary text-white hover:bg-dh-secondary hover:text-black">
                    Shop all products
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-3xl bg-white shadow-sm"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                <p className="font-black">Categories could not load.</p>
                <p className="mt-1 text-sm">{loadError}</p>
              </div>
            ) : filteredDepartments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDepartments.map((department) => (
                  <DepartmentCard
                    key={department.slug}
                    department={department}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <Grid3X3 className="mx-auto h-12 w-12 text-dh-primary" />
                <h2 className="mt-4 font-display text-2xl font-black text-dh-primary">
                  No department matches that search
                </h2>
                <Button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-5 rounded-full bg-dh-primary"
                >
                  Show all departments
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
