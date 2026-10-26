export class BookStorePage {
  constructor(page) {
    this.page = page;
    this.searchBox = page.getByRole('textbox', { name: 'Type to search' });
    // The current site exposes table roles; keep the older CSS as fallbacks.
    const table = page.getByRole('table');
    this.bookLinks = table.getByRole('link')
      .or(page.locator('.rt-tbody').getByRole('link'));
    // Exclude the table's empty placeholder rows.
    this.bookRows = table.getByRole('row')
      .or(page.locator('.rt-tbody .rt-tr-group'))
      .filter({ has: page.getByRole('link') });
    this.previousButton = page.getByRole('button', { name: 'Previous', exact: true });
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.pageIndicator = page.getByText(/^Page\s+\d+\s+of\s+\d+$/);
    // Details values use repeated IDs on this site, so scope each to its wrapper.
    this.detailValues = Object.fromEntries(Object.entries({
      isbn: 'ISBN',
      title: 'title',
      subTitle: 'subtitle',
      author: 'author',
      publisher: 'publisher',
      pages: 'pages',
      description: 'description',
    }).map(([field, wrapper]) => [
      field, page.locator(`#${wrapper}-wrapper`).locator('[id="userName-value"]'),
    ]));
    this.websiteValue = page.locator('#website-wrapper').locator('[id="userName-value"]');
    this.backToBookStoreButton = page.getByRole('button', {
      name: 'Back To Book Store', exact: true,
    });
  }

  async open() {
    await this.page.goto('https://demoqa.com/books', { waitUntil: 'domcontentloaded' });
    await this.bookLinks.first().waitFor({ state: 'visible' });
  }

  async search(text) {
    // Filling with an empty string clears the search box.
    await this.searchBox.fill(text);
  }

  async findBookLink(isbn) {
    await this.firstPage();
    const visited = new Set();
    while (true) {
      const label = await this.pageIndicator.innerText();
      if (visited.has(label)) throw new Error(`Pagination repeated ${label}`);
      visited.add(label);
      for (const link of await this.bookLinks.all()) {
        const href = await link.getAttribute('href');
        const url = new URL(href, this.page.url());
        // Inspect query values without assuming the site's parameter name.
        if ([...url.searchParams.values()].includes(isbn)) return link;
      }
      if (!await this.nextButton.isEnabled()) {
        throw new Error(`No catalogue link identifies ISBN ${isbn}`);
      }
      await this.changePage(this.nextButton);
    }
  }

  async backToCatalogue() {
    await this.backToBookStoreButton.click();
    await this.bookLinks.first().waitFor({ state: 'visible' });
  }

  rowsWithoutText(text) {
    // Playwright accepts a string or a regular expression here.
    return this.bookRows.filter({ hasNotText: text });
  }

  async getBooks() {
    // Read one consistent page snapshot in a single browser operation. Reading
    // every cell separately can exhaust expect.poll's deadline on slower runners.
    return this.bookRows.evaluateAll(rows => rows.map(row => {
      const cells = row.querySelectorAll('td, [role="cell"], .rt-td');
      const link = row.querySelector('a[href], [role="link"][href]');
      if (cells.length < 4 || !link) {
        throw new Error('Cannot read catalogue row: expected a book link and four cells');
      }
      const url = new URL(link.getAttribute('href'), row.ownerDocument.baseURI);
      return {
        isbn: url.searchParams.get('search') ?? url.searchParams.get('book'),
        title: cells[1].innerText.trim(),
        author: cells[2].innerText.trim(),
        publisher: cells[3].innerText.trim(),
      };
    }));
  }

  async changePage(button) {
    const previousLabel = await this.pageIndicator.innerText();
    await button.click();
    // Wait for a real pagination change rather than sleeping for a fixed time.
    await this.pageIndicator.filter({ hasNotText: previousLabel }).waitFor();
  }

  async firstPage() {
    const visited = new Set();
    while (await this.previousButton.isEnabled()) {
      const label = await this.pageIndicator.innerText();
      if (visited.has(label)) throw new Error(`Pagination repeated ${label}`);
      visited.add(label);
      await this.changePage(this.previousButton);
    }
  }

  async getAllBooks() {
    await this.firstPage();
    const books = [];
    const visited = new Set();
    while (true) {
      const label = await this.pageIndicator.innerText();
      if (visited.has(label)) throw new Error(`Pagination repeated ${label}`);
      visited.add(label);
      books.push(...await this.getBooks());
      if (!await this.nextButton.isEnabled()) break;
      await this.changePage(this.nextButton);
    }
    await this.firstPage();
    return books;
  }
}
