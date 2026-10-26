export const catalogueUrl = 'https://demoqa.com/BookStore/v1/Books';

const searchableFields = ['title', 'author', 'publisher'];
const unsupportedFields = ['isbn', 'subTitle', 'pages', 'description', 'website'];

function prerequisite(message) {
  throw new Error(`Catalogue prerequisite failed: ${message}`);
}

// Fetch expected data directly, independently of the browser's rendered results.
export async function loadCatalogue(request) {
  let response;
  try {
    response = await request.get(catalogueUrl);
  } catch (error) {
    prerequisite(`GET ${catalogueUrl} failed: ${error.message}`);
  }
  if (!response.ok()) prerequisite(`GET ${catalogueUrl} returned HTTP ${response.status()}`);
  if (!response.headers()['content-type']?.includes('application/json')) {
    prerequisite('the endpoint did not return JSON');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    prerequisite('the endpoint returned invalid JSON');
  }
  if (!Array.isArray(data?.books) || data.books.length === 0) {
    prerequisite('the response must contain a non-empty books array');
  }
  const isbns = new Set();
  for (const [index, book] of data.books.entries()) {
    for (const field of [...searchableFields, 'isbn']) {
      if (typeof book?.[field] !== 'string' || !book[field].trim()) {
        prerequisite(`book ${index} has no usable ${field}`);
      }
    }
    if (isbns.has(book.isbn)) prerequisite(`duplicate ISBN ${book.isbn}`);
    isbns.add(book.isbn);
    for (const field of ['subTitle', 'description', 'website']) {
      if (typeof book[field] !== 'string') prerequisite(`book ${index} has an invalid ${field}`);
    }
    if (!Number.isInteger(book.pages) || book.pages <= 0) {
      prerequisite(`book ${index} has an invalid page count`);
    }
  }
  return data.books;
}

export function matchingBooks(books, query) {
  const text = query.toLowerCase();
  return books.filter(book => searchableFields.some(field =>
    book[field].toLowerCase().includes(text)));
}

function partialText(values, label) {
  for (const value of values) {
    const word = value.match(/[\p{L}\p{N}]{2,}/u)?.[0];
    if (word && value.length > 2) return word.slice(0, Math.min(2, value.length - 1));
  }
  prerequisite(`no usable partial text for ${label}`);
}

function unmatchedText(books, length) {
  for (let index = 0; index < 1000; index++) {
    const text = length === undefined
      ? `unmatched-catalogue-query-${index}`
      : String(index).padStart(length, 'z');
    if (matchingBooks(books, text).length === 0) return text;
  }
  prerequisite(`could not generate an unmatched ${length ?? 'variable'}-character input`);
}

export function createSearchData(books) {
  const queries = {
    title: books[0].title,
    partialTitle: partialText(books.map(book => book.title), 'title'),
    author: books[0].author,
    publisher: books[0].publisher,
    // Uppercase a current author fragment to exercise case-insensitive matching.
    partialFields: partialText(books.map(book => book.author), 'searchable fields').toUpperCase(),
    unmatched: unmatchedText(books),
    longUnmatched: unmatchedText(books, 300),
  };

  for (const field of unsupportedFields) {
    // Descriptions can contain line breaks; a textbox needs a single-line input.
    const value = books.map(book => displayText(String(book[field]))).find(text =>
      text.length > 0 && matchingBooks(books, text).length === 0);
    if (!value) {
      prerequisite(`no non-empty ${field} value is absent from all title/author/publisher fields`);
    }
    queries[field] = value;
  }

  // Freeze each scenario's expectation before its query is entered in the UI.
  return Object.fromEntries(Object.entries(queries).map(([key, query]) => [
    key, { query, expected: matchingBooks(books, query).map(catalogueView) },
  ]));
}

function displayText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function catalogueView(book) {
  return {
    isbn: book.isbn,
    title: displayText(book.title),
    author: displayText(book.author),
    publisher: displayText(book.publisher),
  };
}

// Result order is not part of search matching; ISBN also distinguishes duplicate titles.
export function sortedBooks(books) {
  return [...books].sort((a, b) => a.isbn.localeCompare(b.isbn));
}
