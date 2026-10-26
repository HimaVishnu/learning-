import { test, expect } from '@playwright/test';
import { BookStorePage } from '../pages/BookStorePage.js';
import {
  loadCatalogue,
  createSearchData,
  catalogueView,
  sortedBooks,
} from '../test-data/bookSearchData.js';

test.describe('Book Store search', () => {
  let bookStore;
  let catalogue;
  let searchData;

  test.beforeEach(async ({ page, request }) => {
    // A failed API request or unusable data fails setup; it never skips the test.
    catalogue = await loadCatalogue(request);
    searchData = createSearchData(catalogue);
    bookStore = new BookStorePage(page);
    await bookStore.open();

    // Validate the complete starting catalogue, including any additional pages.
    const expectedCatalogue = sortedBooks(catalogue.map(catalogueView));
    await expect.poll(async () => sortedBooks(await bookStore.getAllBooks()), {
      message: 'The unfiltered UI catalogue must match the independent catalogue API',
    }).toEqual(expectedCatalogue);
  });

  // These three entries create three independent tests, not one combined test.
  const matchingSearches = [
    { name: 'Search by full title', key: 'title' },
    { name: 'Search by partial title', key: 'partialTitle' },
    { name: 'Search by author', key: 'author' },
  ];

  async function checkMatchingSearch(key) {
    const { query, expected } = searchData[key];
    expect(query.trim().length).toBeGreaterThan(0);
    expect(expected.length).toBeGreaterThan(0);
    const expectedBooks = sortedBooks(expected);

    await bookStore.search(query);

    await expect(bookStore.searchBox).toHaveValue(query);
    await expect.poll(async () => sortedBooks(await bookStore.getAllBooks()), {
      message: `Search ${JSON.stringify(query)} must match title, author or publisher, ignoring case`,
    }).toEqual(expectedBooks);
  }

  for (const { name, key } of matchingSearches) {
    test(name, async () => {
      await checkMatchingSearch(key);
    });
  }

  test('Search by publisher', async () => {
    await checkMatchingSearch('publisher');
  });

  test('Search by partial text across searchable fields', async () => {
    await checkMatchingSearch('partialFields');
  });

  const noMatchSearches = [
    { name: 'Search with unmatched text', key: 'unmatched' },
    { name: 'Search with a long unmatched string', key: 'longUnmatched' },
    { name: 'Search by ISBN is not supported', key: 'isbn' },
    { name: 'Search by subtitle is not supported', key: 'subTitle' },
    { name: 'Search by total pages is not supported', key: 'pages' },
    { name: 'Search by description is not supported', key: 'description' },
    { name: 'Search by website is not supported', key: 'website' },
  ];

  for (const { name, key } of noMatchSearches) {
    test(name, async () => {
      const { query, expected } = searchData[key];
      expect(query.trim().length).toBeGreaterThan(0);
      // Confirm absence in the API catalogue before entering the input.
      expect(expected).toEqual([]);
      if (key === 'longUnmatched') expect(query).toHaveLength(300);

      await bookStore.search(query);

      await expect(bookStore.searchBox).toHaveValue(query);
      await expect(bookStore.bookLinks).toHaveCount(0);
      await expect.poll(() => bookStore.getAllBooks()).toEqual([]);
    });
  }

  test('Clear search and restore the list', async () => {
    // Setup already checked this unfiltered UI against the independent API.
    const originalCatalogueOrder = await bookStore.getAllBooks();
    const originalFirstPage = await bookStore.getBooks();

    await checkMatchingSearch('partialTitle');
    await bookStore.search('');

    await expect(bookStore.searchBox).toHaveValue('');
    await expect.poll(() => bookStore.getAllBooks(), {
      message: 'Clearing must restore all original books in their original order',
    }).toEqual(originalCatalogueOrder);
    await expect.poll(() => bookStore.getBooks(), {
      message: 'Clearing must restore the original first page',
    }).toEqual(originalFirstPage);
  });
});
