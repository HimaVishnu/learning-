import { test, expect } from '@playwright/test';
import { BookStorePage } from '../pages/BookStorePage.js';
import { loadCatalogue, catalogueView, sortedBooks } from '../test-data/bookSearchData.js';

test('Each current book displays its API details and returns to the catalogue', async ({ page, request }) => {
  const books = await loadCatalogue(request);
  // This is one test visiting every book; allow time proportional to catalogue size.
  test.setTimeout(30_000 + books.length * 30_000);
  const bookStore = new BookStorePage(page);
  const expectedCatalogue = sortedBooks(books.map(catalogueView));

  for (const book of books) {
    await test.step(`${book.title} — ISBN ${book.isbn}`, async () => {
      let selectedUrl;
      let isbnParameter;
      let catalogueUrl;

      await test.step('Open the catalogue and click the selected book', async () => {
        await bookStore.open();
        catalogueUrl = page.url();
        await expect.poll(async () => sortedBooks(await bookStore.getAllBooks()))
          .toEqual(expectedCatalogue);

        const link = await bookStore.findBookLink(book.isbn);
        selectedUrl = new URL(await link.getAttribute('href'), catalogueUrl);
        const isbnEntries = [...selectedUrl.searchParams.entries()]
          .filter(([, value]) => value === book.isbn);
        expect(isbnEntries, 'The selected link must identify the API ISBN').toHaveLength(1);
        [isbnParameter] = isbnEntries[0];
        await link.click();
      });

      await test.step('Verify the actual details URL identifies the selected ISBN', async () => {
        await expect(page).toHaveURL(selectedUrl.href);
        expect(new URL(page.url()).searchParams.get(isbnParameter)).toBe(book.isbn);
      });

      await test.step('Compare displayed book fields with the Books API', async () => {
        for (const field of ['isbn', 'title', 'subTitle', 'author', 'publisher', 'pages', 'description']) {
          await expect.soft(bookStore.detailValues[field], `${book.isbn}: ${field}`)
            .toHaveText(String(book[field]));
        }
      });

      await test.step('Verify the displayed website matches the API', async () => {
        await expect.soft(bookStore.websiteValue, `${book.isbn}: displayed website must match the API`)
          .toHaveText(book.website);
      });

      await test.step('Click Back To Book Store', async () => {
        await bookStore.backToCatalogue();
      });

      await test.step('Verify the catalogue URL and complete book list return', async () => {
        await expect(page).toHaveURL(catalogueUrl);
        await expect.poll(async () => sortedBooks(await bookStore.getAllBooks()))
          .toEqual(expectedCatalogue);
      });
    });
  }
});
