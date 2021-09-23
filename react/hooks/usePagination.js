import { useReducer, useState, useEffect, useCallback, useRef } from 'react'
import { max } from 'ramda'
import { useRuntime } from 'vtex.render-runtime'
import {
  useSearchPageStateDispatch,
  useSearchPageState,
} from 'vtex.search-page-context/SearchPageContext'

import useSearchState from './useSearchState'

export const NEXT_PAGE = 'NEXT_PAGE'
export const PREVIOUS_PAGE = 'PREVIOUS_PAGE'
export const TO_PAGE = 'TO_PAGE'
export const LAST_PAGE = 'LAST_PAGE'
export const FIRST_PAGE = 'FIRST_PAGE'

function reducer(state, action) {
  const { maxItemsPerPage, to, from, rollbackState, page } = action.args

  console.log('reducer: ', { state }, action.type)

  switch (action.type) {
    case 'RESET':
      return {
        page: 1,
        nextPage: 2,
        previousPage: 0,
        from: 0,
        to: maxItemsPerPage - 1,
      }

    case 'NEXT_PAGE':
      return {
        ...state,
        page: state.nextPage,
        nextPage: state.nextPage + 1,
        previousPage: state.previousPage + 1,
        to,
        from
      }

    case 'PREVIOUS_PAGE':
      return {
        ...state,
        page: state.previousPage,
        previousPage: state.previousPage - 1,
        nextPage: state.nextPage + 1,
        from,
        to
      }

    case 'TO_PAGE':
      return {
        ...state,
        page: page,
        previousPage: page - 1,
        nextPage: page + 1,
        from,
        to
      }

    case 'ROLLBACK':
      return rollbackState

    default:
      const tp = action.type
      console.log(`Type "${tp}" not mapped`)
  }
}

const handlePagination = async (
  from,
  to,
  paginationLocked,
  setLoading,
  fetchMore,
  products,
  fuzzy,
  updateQueryError,
  operator,
  searchState
) => { 
  if (paginationLocked.current || products.length === 0) {
    return
  }

  paginationLocked.current = true

  setLoading(true)

  return fetchMore({
    variables: {
      from,
      to,
      fuzzy,
      operator,
      searchState,
    },

    updateQuery: (prevResult, { fetchMoreResult }) => {
      setLoading(false)

      paginationLocked.current = false

      if (!products || !fetchMoreResult) {
        updateQueryError.current = true

        return
      }

      return { ...fetchMoreResult, productSearch: { ...fetchMoreResult.productSearch, products: [...fetchMoreResult.productSearch.products] } }
    },
  }).catch((error) => {
    setLoading(false)
    paginationLocked.current = false
    updateQueryError.current = true

    return { error }
  })
}

const usePaginating = () => {
  const [loading, localSetMore] = useState(false)
  const { isFetchingMore } = useSearchPageState()
  const dispatch = useSearchPageStateDispatch()

  const setFetchMore = useCallback((value) => {
    localSetMore(value)
  }, [dispatch])

  const stateValue = isFetchingMore == null ? loading : isFetchingMore

  return [stateValue, setFetchMore]
}

export const usePagination = (props) => {
  const {
    page,
    recordsFiltered,
    maxItemsPerPage,
    fetchMore,
    products,
    queryData: { query, map, orderBy, priceRange }
  } = props

  const { setQuery, query: runtimeQuery } = useRuntime()
  const { fuzzy, operator, searchState } = useSearchState()
  const currentPage = (runtimeQuery.page && Number(runtimeQuery.page)) || page

  const initialState = {
    page: currentPage,
    nextPage: currentPage + 1,
    previousPage: currentPage - 1,
    from: (currentPage - 1) * maxItemsPerPage,
    to: currentPage * maxItemsPerPage - 1,
  }

  const [pageState, pageDispatch] = useReducer(reducer, initialState)
  const [loading, setLoading] = usePaginating()
  const isFirstRender = useRef(true)
  const paginationLocked = useRef(false)
  const [paginationError, setpaginationError] = useState(false)
  const updateQueryError = useRef(false)

  useEffect(() => {
    if (!isFirstRender.current) {
      pageDispatch({ type: 'RESET', args: { maxItemsPerPage } })
    }

    isFirstRender.current = false
  }, [maxItemsPerPage, query, map, orderBy, priceRange])

  const handlePaginationMove = async (type, page = 0) => {
    const rollbackState = pageState
    const args = {}
    console.log({ type, pageState }, pageState.to)

    switch (type) {
      case PREVIOUS_PAGE:
        args.to = pageState.to - maxItemsPerPage
        args.from = max(0, args.to - maxItemsPerPage + 1)
        args.page = pageState.page - 1
        break

      case NEXT_PAGE:
        args.from = pageState.to + 1
        args.to = args.from + maxItemsPerPage - 1
        args.page = pageState.page + 1
        break

      case TO_PAGE:
        if (page <= 0) return
        args.from = (page - 1) * maxItemsPerPage,
        args.to = page * maxItemsPerPage - 1
        args.page = page
        break

      default:
        return
    }

    console.log({ args })

    pageDispatch({ type, args })

    setQuery(
      {
        page: args.page,
      },
      { replace: true }
    )

    const promiseResult = await handlePagination(
      args.from,
      args.to,
      paginationLocked,
      setLoading,
      fetchMore,
      products,
      fuzzy,
      updateQueryError,
      operator,
      sessionStorage.getItem('searchState') ?? searchState
    )

    if (!promiseResult || !updateQueryError.current) {
      return
    }

    pageDispatch({ type: 'ROLLBACK', args: { rollbackState } })
    setQuery({ page: pageState.page }, { replace: true, merge: true })
    setInfiniteScrollError(false)
    updateQueryError.current = false
  }

  return {
    handlePaginationMove,
    loading,
    from: pageState.from,
    to: pageState.to,
    nextPage: pageState.nextPage,
    previousPage: pageState.previousPage,
    currentPage: pageState.page,
    paginationError,
  }
}
