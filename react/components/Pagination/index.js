import React, { useState, useEffect, Fragment } from 'react'
import { path, max, range } from 'ramda'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { ButtonGroup, Button } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useDevice } from 'vtex.device-detector'

import {
  usePagination,
  PREVIOUS_PAGE,
  NEXT_PAGE,
  TO_PAGE,
  FIRST_PAGE,
  LAST_PAGE,
} from '../../hooks/usePagination'

import "./styles.css"

const CSS_HANDLES = [
  'wrapper',
  'info',
  'infoFrom',
  'infoTo',
  'buttonsWrapper',
  'button',
  'buttonCurrent'
]

const Pagination = ({ neighbours = 2, position = 'center', showInfo = true }) => {
  const { isMobile } = useDevice()

  const { searchQuery, maxItemsPerPage, page } = useSearchPage()
  const products = path(['data', 'productSearch', 'products'], searchQuery)
  const recordsFiltered = path(['data', 'productSearch', 'recordsFiltered'],searchQuery)
  const fetchMore = path(['fetchMore'], searchQuery)
  const queryData = {
    query: path(['variables', 'query'], searchQuery),
    map: path(['variables', 'map'], searchQuery),
    orderBy: path(['variables', 'orderBy'], searchQuery),
    priceRange: path(['variables', 'priceRange'], searchQuery),
  }
  const { handlePaginationMove, loading, from, to, previousPage, nextPage, currentPage } =
    usePagination({ page, recordsFiltered, maxItemsPerPage, fetchMore, products, queryData })

  const [pageNeighbours, setPageNeighbours] = useState(isMobile ? 1 : neighbours)
  const [totalPages, setTotalPages] = useState(0)
  const [pages, setPages] = useState([])
  const [pagesMounted, setPagesMounted] = useState([])

  const handleNeighbours = () => {
    return Math.max(0, Math.min(pageNeighbours, 2))
  }

  const countTotalPages = () => {
    const totalPages = Math.trunc(recordsFiltered / maxItemsPerPage)
    const maxPages = 50

    return totalPages > maxPages ? maxPages : totalPages 
  }

  const fetchPageNumbers = () => {
    const maxDisplayedElements = pageNeighbours * 2 + 1

    if (totalPages > maxDisplayedElements) {
      const startPage = Math.max(1, currentPage - pageNeighbours)
      const endPage = Math.min(totalPages + 1, currentPage + pageNeighbours)
      
      let pages = range(startPage, endPage + 1)

      if(currentPage === 1) {
        pages = [...pages, maxDisplayedElements]
      }
      else if(currentPage === totalPages + 1) {
        pages = [totalPages - 1, ...pages]
      }

      return [FIRST_PAGE, PREVIOUS_PAGE, ...pages, NEXT_PAGE, LAST_PAGE]
    }

    return range(1, totalPages + 1)
  }

  const mountButtons = () => {

    const pagesMounted = pages.reduce((acc, page) => {
      let pageButton = null
      
      switch (page) {
        case FIRST_PAGE:
          pageButton = (
            <button
              key={page}
              onClick={async () => { await handlePaginationMove(TO_PAGE, 1); handleToTop() }}
              className={`${handles.button} ${isMobile ? 'w-100' : ''}`}
            >
              <div className={handles.button}>primeiro</div>
            </button>
          )
          break
        case LAST_PAGE:
          pageButton = (
            <button
              key={page}
              onClick={async () => { await handlePaginationMove(TO_PAGE, totalPages); handleToTop() }}
              className={`${handles.button} ${isMobile ? 'w-100' : ''}`}
            >
              <div className={handles.button}>último</div>
            </button>
          )
          break

        case NEXT_PAGE:
          pageButton = (
            <button
              key={page}
              onClick={async () => { await handlePaginationMove(NEXT_PAGE); handleToTop() }}
              className={`${handles.button} ${isMobile ? 'w-100' : ''}`}
            >
              <div className={handles.button}>próximo</div>
            </button>
          )
          break

        case PREVIOUS_PAGE:
          pageButton = (
            <button
              key={page}
              onClick={async () => { await handlePaginationMove(PREVIOUS_PAGE); handleToTop() }}
              className={`${handles.button} ${isMobile ? 'w-100' : ''}`}
            >
              <div className={handles.button}>anterior</div>
            </button>
          )
          break

        default:
          pageButton = (
            <button
              key={page}
              onClick={async () => { await handlePaginationMove(TO_PAGE, page); handleToTop() }}
              className={`${handles.button} ${currentPage === page ? handles.buttonCurrent + ' bg-action-primary' : ''}`}
            >
              <div className={handles.button}>
                { page }
              </div>
            </button>
          )
      }

      return [...acc, pageButton]
    }, [])

    return pagesMounted
  }

  const handles = useCssHandles(CSS_HANDLES)

  const handleToTop = () => {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  }

  useEffect(() => {   
    // setPageNeighbours(handleNeighbours())
    setTotalPages(countTotalPages())

  }, [useSearchPage()])

  useEffect(() => {
    setPages(fetchPageNumbers())
  }, [totalPages, currentPage])

  useEffect(() => {
    setPagesMounted(mountButtons())
  }, [pages])

  return (
    <div className={`w-100 flex justify-${position} ${handles.wrapper} `}>
      {!!showInfo &&
        <div className={handles.info}>
          <p className={handles.info}>
            <span className={handles.infoFrom}>{from + 1}</span> - <span className={handles.infoTo}>{to + 1}</span>
          </p>
        </div>
      }

      {!!pagesMounted?.length &&
        <div className={`flex ${handles.buttonsWrapper}`}>
          {pagesMounted.map(button => button)}
        </div>
      }
    </div>
  )
}

export default Pagination
