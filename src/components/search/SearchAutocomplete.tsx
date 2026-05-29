import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  ImageUp,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import {
  fetchSearchSuggestions,
  searchProductsByImage,
  type SearchSuggestionProduct,
} from '@/lib/woocommerce'

type SearchAutocompleteProps = {
  compact?: boolean
  placeholder?: string
  className?: string
  initialValue?: string
  onSearch?: (query: string) => void
}

function formatPrice(price: string | number) {
  const value = Number(price || 0)

  if (!Number.isFinite(value) || value <= 0) return 'Check price'

  return `K${value.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function saveSearchHistory(value: string) {
  if (typeof window === 'undefined' || value.trim().length < 2) return

  try {
    const key = 'digitalhood-shop-searches'
    const previous = JSON.parse(window.localStorage.getItem(key) || '[]')
    const next = [
      value.trim(),
      ...previous.filter((item: string) => item !== value.trim()),
    ].slice(0, 20)

    window.localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Ignore local storage issues.
  }
}

export default function SearchAutocomplete({
  compact = false,
  placeholder = 'Search products, brands, categories...',
  className = '',
  initialValue = '',
  onSearch,
}: SearchAutocompleteProps) {
  const navigate = useNavigate()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<SearchSuggestionProduct[]>([])
  const [didYouMean, setDidYouMean] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageHint, setImageHint] = useState('')
  const [imageMessage, setImageMessage] = useState('')
  const [isImageSearching, setIsImageSearching] = useState(false)

  const trimmedQuery = query.trim()

  const popularFallback = useMemo(
    () => ['iphone', 'samsung', 'charger', 'laptop', 'phone case'],
    []
  )

  useEffect(() => {
    setQuery(initialValue)
  }, [initialValue])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [imageFile])

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setSuggestions([])
      setDidYouMean('')
      setIsLoading(false)
      return
    }

    let cancelled = false

    setIsLoading(true)

    const timer = window.setTimeout(() => {
      fetchSearchSuggestions(trimmedQuery, 8)
        .then((response) => {
          if (cancelled) return

          setSuggestions(response.suggestions || [])
          setDidYouMean(response.didYouMean || '')
          setIsOpen(true)
        })
        .catch(() => {
          if (cancelled) return

          setSuggestions([])
          setDidYouMean('')
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [trimmedQuery])

  const submitSearch = (value = query) => {
    const cleaned = value.trim()

    if (!cleaned) {
      navigate('/shop')
      return
    }

    saveSearchHistory(cleaned)
    setIsOpen(false)

    if (onSearch) {
      onSearch(cleaned)
      return
    }

    navigate(`/shop?search=${encodeURIComponent(cleaned)}`)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submitSearch()
  }

  const handleImageSearch = async () => {
    if (!imageFile) {
      fileInputRef.current?.click()
      return
    }

    setIsImageSearching(true)
    setImageMessage('')

    try {
      const response = await searchProductsByImage(imageFile, imageHint)

      setSuggestions(response.suggestions || [])
      setDidYouMean(response.didYouMean || '')
      setImageMessage(
        response.message ||
          'Image search completed. Showing the closest marketplace matches.'
      )
      setQuery(response.correctedQuery || response.query || imageHint)
      setIsOpen(true)
      setIsImageSearchOpen(false)
    } catch (error) {
      setImageMessage(
        error instanceof Error
          ? error.message
          : 'Image search failed. Try another image or add a product hint.'
      )
    } finally {
      setIsImageSearching(false)
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dh-dark-gray" />

        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (trimmedQuery.length >= 2 || suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          placeholder={placeholder}
          className={`w-full rounded-full border-2 border-gray-200 bg-white pl-12 pr-28 text-sm outline-none transition-colors focus:border-dh-primary ${
            compact ? 'h-11' : 'h-12'
          }`}
        />

        <button
          type="button"
          onClick={() => setIsImageSearchOpen(true)}
          className="absolute right-[4.8rem] top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-dh-gray text-dh-primary transition-colors hover:bg-[#ffb54a]"
          aria-label="Search by image"
        >
          <Camera className="h-4 w-4" />
        </button>

        <button
          type="submit"
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded-full bg-dh-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ffb54a] hover:text-dh-primary"
        >
          Search
        </button>
      </form>

      {isImageSearchOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] overflow-hidden rounded-3xl border border-dh-light-gray bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-dh-light-gray p-4">
            <div>
              <p className="font-display text-lg font-bold text-dh-primary">
                Search by image
              </p>
              <p className="text-xs text-dh-dark-gray">
                Upload a product photo. Add a hint for stronger results.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsImageSearchOpen(false)}
              className="rounded-full p-2 hover:bg-dh-gray"
              aria-label="Close image search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setImageFile(file)
                setImageMessage('')
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-dh-light-gray bg-dh-gray/50 p-5 text-center transition-colors hover:border-dh-primary"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Selected search preview"
                  className="mb-3 h-32 w-32 rounded-2xl object-cover"
                />
              ) : (
                <ImageUp className="mb-3 h-10 w-10 text-dh-primary" />
              )}

              <span className="font-bold text-dh-primary">
                {imageFile ? imageFile.name : 'Choose product image'}
              </span>
              <span className="mt-1 text-xs text-dh-dark-gray">
                JPG, PNG, WEBP or GIF. Max 8MB.
              </span>
            </button>

            <input
              type="text"
              value={imageHint}
              onChange={(event) => setImageHint(event.target.value)}
              placeholder="Optional hint e.g. iPhone case, Samsung charger..."
              className="mt-3 h-11 w-full rounded-full border border-dh-light-gray px-4 text-sm outline-none focus:border-dh-primary"
            />

            {imageMessage && (
              <p className="mt-3 rounded-2xl bg-[#fff7e8] p-3 text-xs font-semibold text-dh-primary">
                {imageMessage}
              </p>
            )}

            <button
              type="button"
              disabled={isImageSearching}
              onClick={handleImageSearch}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-dh-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#ffb54a] hover:text-dh-primary disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isImageSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching image...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Search with image
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] overflow-hidden rounded-3xl border border-dh-light-gray bg-white shadow-2xl">
          {trimmedQuery.length < 2 && suggestions.length === 0 ? (
            <div className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                Popular searches
              </p>
              <div className="flex flex-wrap gap-2">
                {popularFallback.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item)
                      submitSearch(item)
                    }}
                    className="rounded-full bg-dh-gray px-3 py-2 text-xs font-bold text-dh-primary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-3 p-4 text-sm font-semibold text-dh-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding matching products...
            </div>
          ) : (
            <>
              {didYouMean && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery(didYouMean)
                    submitSearch(didYouMean)
                  }}
                  className="flex w-full items-center gap-2 border-b border-dh-light-gray bg-[#fff7e8] px-4 py-3 text-left text-sm font-semibold text-dh-primary"
                >
                  <Sparkles className="h-4 w-4 text-[#ffb54a]" />
                  Did you mean <span className="font-black">{didYouMean}</span>?
                </button>
              )}

              {suggestions.length > 0 ? (
                <div className="max-h-[28rem] overflow-y-auto p-2">
                  {suggestions.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug}`}
                      onClick={() => {
                        saveSearchHistory(trimmedQuery)
                        setIsOpen(false)
                      }}
                      className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-dh-gray"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-dh-gray">
                        <img
                          src={product.image || '/logo.jpg'}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold leading-snug text-dh-primary">
                          {product.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-dh-primary">
                            {formatPrice(product.price)}
                          </span>
                          {product.category?.name && (
                            <span className="rounded-full bg-dh-gray px-2 py-0.5 text-[11px] font-semibold text-dh-dark-gray">
                              {product.category.name}
                            </span>
                          )}
                          {product.stock_label && (
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                              {product.stock_label}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <p className="font-semibold text-dh-primary">
                    No quick suggestions found
                  </p>
                  <p className="mt-1 text-sm text-dh-dark-gray">
                    Press Search to check the full marketplace.
                  </p>
                </div>
              )}

              <div className="border-t border-dh-light-gray p-2">
                <button
                  type="button"
                  onClick={() => submitSearch()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-dh-primary px-4 py-3 text-sm font-bold text-white"
                >
                  Search all products
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
