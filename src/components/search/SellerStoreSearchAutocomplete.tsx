import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  FormEvent,
  KeyboardEvent,
} from 'react'
import {
  useNavigate,
} from 'react-router-dom'
import {
  Clock3,
  FolderSearch,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import {
  fetchPublicSellerStoreSuggestions,
  type PublicSellerStoreFacetCategory,
  type PublicSellerStoreSuggestionCategory,
  type PublicSellerStoreSuggestionProduct,
} from '@/api/publicSellers'
import {
  SEARCH_HISTORY_CHANGED_EVENT,
  readMarketplaceSearchHistory,
  saveMarketplaceSearch,
} from '@/lib/marketplaceBrowserState'

type SellerStoreSearchAutocompleteProps = {
  sellerKey: string
  storeName: string
  value: string
  onValueChange: (
    value: string
  ) => void
  onSearch: (
    value: string
  ) => void
  onCategorySelect: (
    category: PublicSellerStoreSuggestionCategory,
    search: string
  ) => void
  popularCategories?: PublicSellerStoreFacetCategory[]
  isSearching?: boolean
}

type SearchAction =
  | {
      id: string
      kind: 'correction'
      value: string
    }
  | {
      id: string
      kind: 'category'
      category: PublicSellerStoreSuggestionCategory
    }
  | {
      id: string
      kind: 'product'
      product: PublicSellerStoreSuggestionProduct
    }
  | {
      id: string
      kind: 'search'
      value: string
    }

const SEARCH_DEBOUNCE_MS =
  200

function formatPrice(
  value: unknown
) {
  const numericValue =
    Number(value || 0)

  if (
    !Number.isFinite(
      numericValue
    ) ||
    numericValue <= 0
  ) {
    return 'Check price'
  }

  return `K${numericValue.toLocaleString(
    'en-ZM',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`
}

function normalizeComparableSearch(
  value = ''
) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      ' '
    )
}

function readRecentSearches(
  sellerKey: string
) {
  return readMarketplaceSearchHistory(
    sellerKey
  )
}

function saveRecentSearch(
  sellerKey: string,
  value: string
) {
  saveMarketplaceSearch(
    value,
    sellerKey
  )
}

export default function SellerStoreSearchAutocomplete({
  sellerKey,
  storeName,
  value,
  onValueChange,
  onSearch,
  onCategorySelect,
  popularCategories = [],
  isSearching = false,
}: SellerStoreSearchAutocompleteProps) {
  const navigate =
    useNavigate()

  const wrapperRef =
    useRef<HTMLDivElement>(
      null
    )

  const inputRef =
    useRef<HTMLInputElement>(
      null
    )

  const requestSequenceRef =
    useRef(0)

  const isFocusedRef =
    useRef(false)

  const [suggestions, setSuggestions] =
    useState<
      PublicSellerStoreSuggestionProduct[]
    >([])

  const [categories, setCategories] =
    useState<
      PublicSellerStoreSuggestionCategory[]
    >([])

  const [didYouMean, setDidYouMean] =
    useState('')

  const [isOpen, setIsOpen] =
    useState(false)

  const [isLoading, setIsLoading] =
    useState(false)

  const [requestError, setRequestError] =
    useState('')

  const [activeIndex, setActiveIndex] =
    useState(-1)

  const [recentSearches, setRecentSearches] =
    useState<string[]>(
      []
    )

  const trimmedValue =
    value
      .trim()
      .slice(
        0,
        80
      )

  const correctedSearch =
    didYouMean &&
    normalizeComparableSearch(
      didYouMean
    ) !==
      normalizeComparableSearch(
        trimmedValue
      )
      ? didYouMean
      : ''

  const popularStoreCategories =
    useMemo(
      () =>
        popularCategories
          .filter(
            (category) =>
              category.name &&
              category.slug
          )
          .slice(
            0,
            5
          ),
      [
        popularCategories,
      ]
    )

  useEffect(() => {
    const refreshHistory = () => {
      setRecentSearches(
        readRecentSearches(
          sellerKey
        )
      )
    }

    refreshHistory()

    window.addEventListener(
      SEARCH_HISTORY_CHANGED_EVENT,
      refreshHistory
    )

    return () => {
      window.removeEventListener(
        SEARCH_HISTORY_CHANGED_EVENT,
        refreshHistory
      )
    }
  }, [
    sellerKey,
  ])

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        !wrapperRef.current ||
        wrapperRef.current.contains(
          event.target as Node
        )
      ) {
        return
      }

      isFocusedRef.current =
        false

      setIsOpen(false)
      setActiveIndex(-1)
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  useEffect(() => {
    const sequence =
      requestSequenceRef.current +
      1

    requestSequenceRef.current =
      sequence

    if (
      trimmedValue.length < 2
    ) {
      setSuggestions([])
      setCategories([])
      setDidYouMean('')
      setRequestError('')
      setIsLoading(false)
      setActiveIndex(-1)

      return
    }

    const controller =
      new AbortController()

    setIsLoading(true)
    setRequestError('')

    const timer =
      window.setTimeout(
        () => {
          fetchPublicSellerStoreSuggestions(
            sellerKey,
            trimmedValue,
            8,
            {
              signal:
                controller.signal,
            }
          )
            .then(
              (response) => {
                if (
                  controller
                    .signal
                    .aborted ||
                  sequence !==
                    requestSequenceRef
                      .current
                ) {
                  return
                }

                setSuggestions(
                  response.suggestions ||
                    []
                )

                setCategories(
                  response.categories ||
                    []
                )

                setDidYouMean(
                  response.didYouMean ||
                    ''
                )

                setActiveIndex(-1)

                if (
                  isFocusedRef.current
                ) {
                  setIsOpen(true)
                }
              }
            )
            .catch(
              (error) => {
                if (
                  controller
                    .signal
                    .aborted ||
                  error?.name ===
                    'AbortError' ||
                  sequence !==
                    requestSequenceRef
                      .current
                ) {
                  return
                }

                setSuggestions([])
                setCategories([])
                setDidYouMean('')
                setRequestError(
                  error instanceof
                    Error
                    ? error.message
                    : 'Quick results are temporarily unavailable.'
                )
              }
            )
            .finally(
              () => {
                if (
                  !controller
                    .signal
                    .aborted &&
                  sequence ===
                    requestSequenceRef
                      .current
                ) {
                  setIsLoading(
                    false
                  )
                }
              }
            )
        },
        SEARCH_DEBOUNCE_MS
      )

    return () => {
      window.clearTimeout(
        timer
      )

      controller.abort()
    }
  }, [
    sellerKey,
    trimmedValue,
  ])

  const actions =
    useMemo<
      SearchAction[]
    >(
      () => {
        if (
          trimmedValue.length < 2
        ) {
          return []
        }

        const nextActions: SearchAction[] =
          []

        if (
          correctedSearch
        ) {
          nextActions.push({
            id:
              'seller-search-correction',
            kind:
              'correction',
            value:
              correctedSearch,
          })
        }

        for (
          const category
          of categories
        ) {
          nextActions.push({
            id:
              `seller-search-category-${category.slug}`,
            kind:
              'category',
            category,
          })
        }

        for (
          const product
          of suggestions
        ) {
          nextActions.push({
            id:
              `seller-search-product-${product.id}`,
            kind:
              'product',
            product,
          })
        }

        nextActions.push({
          id:
            'seller-search-all',
          kind:
            'search',
          value:
            correctedSearch ||
            trimmedValue,
        })

        return nextActions
      },
      [
        categories,
        correctedSearch,
        suggestions,
        trimmedValue,
      ]
    )

  const activeOptionId =
    activeIndex >= 0
      ? actions[
          activeIndex
        ]?.id
      : undefined

  function closeSearch() {
    isFocusedRef.current =
      false

    setIsOpen(false)
    setActiveIndex(-1)

    inputRef.current?.blur()
  }

  function rememberSearch(
    search: string
  ) {
    saveRecentSearch(
      sellerKey,
      search
    )

    setRecentSearches(
      readRecentSearches(
        sellerKey
      )
    )
  }

  function submitSearch(
    requestedValue =
      trimmedValue
  ) {
    const cleaned =
      String(
        requestedValue ||
          correctedSearch ||
          trimmedValue
      )
        .trim()
        .slice(
          0,
          80
        )

    if (!cleaned) {
      return
    }

    const finalSearch =
      correctedSearch &&
      normalizeComparableSearch(
        cleaned
      ) ===
        normalizeComparableSearch(
          trimmedValue
        )
        ? correctedSearch
        : cleaned

    onValueChange(
      finalSearch
    )

    rememberSearch(
      finalSearch
    )

    closeSearch()

    onSearch(
      finalSearch
    )
  }

  function selectCategory(
    category: PublicSellerStoreSuggestionCategory
  ) {
    const search =
      correctedSearch ||
      trimmedValue

    if (search) {
      onValueChange(
        search
      )

      rememberSearch(
        search
      )
    }

    closeSearch()

    onCategorySelect(
      category,
      search
    )
  }

  function openProduct(
    product: PublicSellerStoreSuggestionProduct
  ) {
    const productKey =
      product.slug ||
      product.id

    if (!productKey) {
      return
    }

    if (trimmedValue) {
      rememberSearch(
        correctedSearch ||
          trimmedValue
      )
    }

    closeSearch()

    navigate(
      `/product/${encodeURIComponent(
        String(
          productKey
        )
      )}`
    )
  }

  function executeAction(
    action:
      | SearchAction
      | undefined
  ) {
    if (!action) return

    if (
      action.kind ===
      'correction'
    ) {
      onValueChange(
        action.value
      )

      submitSearch(
        action.value
      )

      return
    }

    if (
      action.kind ===
      'category'
    ) {
      selectCategory(
        action.category
      )

      return
    }

    if (
      action.kind ===
      'product'
    ) {
      openProduct(
        action.product
      )

      return
    }

    submitSearch(
      action.value
    )
  }

  function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault()

    if (
      activeIndex >= 0
    ) {
      executeAction(
        actions[
          activeIndex
        ]
      )

      return
    }

    submitSearch()
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key ===
      'Escape'
    ) {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)

      return
    }

    if (
      event.key !==
        'ArrowDown' &&
      event.key !==
        'ArrowUp'
    ) {
      return
    }

    if (
      actions.length === 0
    ) {
      return
    }

    event.preventDefault()
    setIsOpen(true)

    setActiveIndex(
      (current) => {
        if (
          event.key ===
          'ArrowDown'
        ) {
          return current >=
            actions.length - 1
            ? 0
            : current + 1
        }

        return current <= 0
          ? actions.length - 1
          : current - 1
      }
    )
  }

  function getActionIndex(
    id: string
  ) {
    return actions.findIndex(
      (action) =>
        action.id === id
    )
  }

  const listboxId =
    `seller-store-search-${String(
      sellerKey
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )}`

  return (
    <div
      ref={wrapperRef}
      className="relative min-w-0 flex-1"
    >
      <form
        onSubmit={handleSubmit}
        className="relative"
        role="search"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        <input
          ref={inputRef}
          type="search"
          value={value}
          maxLength={80}
          autoComplete="off"
          autoCorrect="on"
          spellCheck
          onChange={(event) => {
            onValueChange(
              event.target.value
            )

            isFocusedRef.current =
              true

            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            isFocusedRef.current =
              true

            setIsOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(
              () => {
                if (
                  wrapperRef.current?.contains(
                    document.activeElement
                  )
                ) {
                  return
                }

                isFocusedRef.current =
                  false

                setIsOpen(false)
                setActiveIndex(-1)
              },
              0
            )
          }}
          onKeyDown={
            handleKeyDown
          }
          placeholder={`Search in ${storeName}`}
          aria-label={`Search products in ${storeName}`}
          aria-autocomplete="list"
          aria-expanded={
            isOpen
          }
          aria-controls={
            listboxId
          }
          aria-activedescendant={
            activeOptionId
          }
          className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-20 text-sm font-semibold text-dh-primary outline-none transition focus:border-dh-primary focus:bg-white focus:ring-2 focus:ring-dh-primary/15"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isLoading && (
            <Loader2
              className="h-4 w-4 animate-spin text-dh-primary"
              aria-label="Loading quick results"
            />
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onValueChange('')
                setSuggestions([])
                setCategories([])
                setDidYouMean('')
                setRequestError('')
                setActiveIndex(-1)
                setIsOpen(true)

                inputRef.current?.focus()
              }}
              aria-label="Clear store search"
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-dh-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="submit"
            disabled={
              !trimmedValue ||
              isSearching
            }
            aria-label={`Search ${storeName}`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-dh-primary text-white transition hover:bg-[#ffb54a] hover:text-dh-primary disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSearching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </form>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`Suggestions from ${storeName}`}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[120] max-h-[min(34rem,calc(100vh-9rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          {trimmedValue.length < 2 ? (
            <div className="max-h-[min(28rem,calc(100vh-12rem))] overflow-y-auto overscroll-contain p-3">
              {recentSearches.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-wide text-gray-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    Recent searches
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(
                      (search) => (
                        <button
                          key={search}
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() => {
                            onValueChange(
                              search
                            )

                            submitSearch(
                              search
                            )
                          }}
                          className="rounded-full bg-gray-100 px-3 py-2 text-xs font-black text-dh-primary transition hover:bg-[#ffb54a]/30"
                        >
                          {search}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {popularStoreCategories.length > 0 && (
                <div
                  className={
                    recentSearches.length
                      ? 'mt-4 border-t border-gray-100 pt-4'
                      : ''
                  }
                >
                  <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-wide text-gray-400">
                    <FolderSearch className="h-3.5 w-3.5" />
                    Popular in this store
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {popularStoreCategories.map(
                      (category) => (
                        <button
                          key={category.slug}
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            selectCategory({
                              name:
                                category.name,
                              slug:
                                category.slug,
                              count:
                                category.count,
                            })
                          }
                          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-black text-dh-primary transition hover:border-dh-primary hover:bg-gray-50"
                        >
                          {category.name}
                          <span className="ml-1 text-gray-400">
                            {category.count}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {recentSearches.length === 0 &&
                popularStoreCategories.length === 0 && (
                  <div className="p-3 text-center">
                    <Search className="mx-auto h-6 w-6 text-gray-300" />
                    <p className="mt-2 text-sm font-black text-dh-primary">
                      Search this store
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      Type at least two characters for instant recommendations.
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <>
              <div className="max-h-[min(27rem,calc(100vh-15rem))] overflow-y-auto overscroll-contain">
                {isLoading &&
                  suggestions.length === 0 &&
                  categories.length === 0 && (
                    <div className="flex items-center gap-3 p-4 text-sm font-black text-dh-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finding matches in {storeName}...
                    </div>
                  )}

                {correctedSearch && (
                  <button
                    id="seller-search-correction"
                    role="option"
                    aria-selected={
                      activeOptionId ===
                      'seller-search-correction'
                    }
                    type="button"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onMouseEnter={() =>
                      setActiveIndex(
                        getActionIndex(
                          'seller-search-correction'
                        )
                      )
                    }
                    onClick={() =>
                      submitSearch(
                        correctedSearch
                      )
                    }
                    className={`flex w-full items-center gap-2 border-b border-gray-100 bg-[#fff7e8] px-4 py-3 text-left text-sm font-semibold text-dh-primary transition ${
                      activeOptionId ===
                      'seller-search-correction'
                        ? 'ring-2 ring-inset ring-[#ffb54a]'
                        : ''
                    }`}
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-[#e99a16]" />
                    Did you mean
                    <span className="font-black">
                      {correctedSearch}
                    </span>
                    ?
                  </button>
                )}

                {categories.length > 0 && (
                  <div className="border-b border-gray-100 p-3">
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-wide text-gray-400">
                      Recommended categories
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {categories.map(
                        (category) => {
                          const id =
                            `seller-search-category-${category.slug}`

                          const index =
                            getActionIndex(
                              id
                            )

                          const active =
                            activeOptionId ===
                            id

                          return (
                            <button
                              key={category.slug}
                              id={id}
                              role="option"
                              aria-selected={
                                active
                              }
                              type="button"
                              onMouseDown={(event) =>
                                event.preventDefault()
                              }
                              onMouseEnter={() =>
                                setActiveIndex(
                                  index
                                )
                              }
                              onClick={() =>
                                selectCategory(
                                  category
                                )
                              }
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-black transition ${
                                active
                                  ? 'border-dh-primary bg-dh-primary text-white'
                                  : 'border-gray-200 bg-gray-50 text-dh-primary hover:border-dh-primary'
                              }`}
                            >
                              <FolderSearch className="h-3.5 w-3.5" />
                              {category.name}
                              <span className="opacity-70">
                                {category.count}
                              </span>
                            </button>
                          )
                        }
                      )}
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 pb-1 pt-1 text-[10px] font-black uppercase tracking-wide text-gray-400">
                      Products in {storeName}
                    </p>

                    {suggestions.map(
                      (product) => {
                        const id =
                          `seller-search-product-${product.id}`

                        const index =
                          getActionIndex(
                            id
                          )

                        const active =
                          activeOptionId ===
                          id

                        return (
                          <button
                            key={product.id}
                            id={id}
                            role="option"
                            aria-selected={
                              active
                            }
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onMouseEnter={() =>
                              setActiveIndex(
                                index
                              )
                            }
                            onClick={() =>
                              openProduct(
                                product
                              )
                            }
                            className={`flex w-full gap-3 rounded-xl p-2 text-left transition ${
                              active
                                ? 'bg-dh-primary text-white'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                              <img
                                src={
                                  product.image ||
                                  '/logo.jpg'
                                }
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={(event) => {
                                  event.currentTarget.src =
                                    '/logo.jpg'
                                }}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`line-clamp-2 text-sm font-black leading-snug ${
                                  active
                                    ? 'text-white'
                                    : 'text-dh-primary'
                                }`}
                              >
                                {product.name}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`font-display text-sm font-black ${
                                    active
                                      ? 'text-white'
                                      : 'text-dh-primary'
                                  }`}
                                >
                                  {formatPrice(
                                    product.price
                                  )}
                                </span>

                                {product.category?.name && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                      active
                                        ? 'bg-white/15 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {product.category.name}
                                  </span>
                                )}

                                {product.stockLabel && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                      active
                                        ? 'bg-white/15 text-white'
                                        : product.stockStatus ===
                                            'outofstock'
                                          ? 'bg-red-50 text-red-700'
                                          : 'bg-green-50 text-green-700'
                                    }`}
                                  >
                                    {product.stockLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      }
                    )}
                  </div>
                )}

                {!isLoading &&
                  suggestions.length === 0 &&
                  categories.length === 0 && (
                    <div className="p-5 text-center">
                      <Search className="mx-auto h-7 w-7 text-gray-300" />
                      <p className="mt-2 font-black text-dh-primary">
                        No quick matches
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        Search the complete store catalogue or try another term.
                      </p>
                    </div>
                  )}

                {requestError && (
                  <div className="mx-3 mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {requestError}
                    <span className="ml-1">
                      Complete store search is still available.
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 p-2">
                <button
                  id="seller-search-all"
                  role="option"
                  aria-selected={
                    activeOptionId ===
                    'seller-search-all'
                  }
                  type="button"
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onMouseEnter={() =>
                    setActiveIndex(
                      getActionIndex(
                        'seller-search-all'
                      )
                    )
                  }
                  onClick={() =>
                    submitSearch()
                  }
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
                    activeOptionId ===
                    'seller-search-all'
                      ? 'bg-[#ffb54a] text-dh-primary'
                      : 'bg-dh-primary text-white hover:bg-[#ffb54a] hover:text-dh-primary'
                  }`}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}

                  Search {storeName} for
                  <span className="max-w-[12rem] truncate">
                    “{correctedSearch || trimmedValue}”
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
