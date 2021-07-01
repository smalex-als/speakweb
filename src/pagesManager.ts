import Page from "./page";

class PagesManager {
  private pageId = -1;
  private page: Page | null = null;

  // public pagesDiv: HTMLDivElement;

  constructor() {
    // this.pagesDiv = document.getElementById('auth-pages') as HTMLDivElement;
  }

  public setPage(page: Page) {
    // this.pagesDiv.style.display = 'none';
    page.pageEl.style.display = '';

    this.pageId = -1;

    this.page = page;
  }
}

const pagesManager = new PagesManager();
// MOUNT_CLASS_TO.pagesManager = pagesManager;
export default pagesManager;
