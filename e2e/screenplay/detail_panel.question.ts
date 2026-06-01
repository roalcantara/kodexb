import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

export class DetailPanelShowsTitle implements Answerable {
  private constructor(private readonly title: string) {}

  static named(title: string): DetailPanelShowsTitle {
    return new DetailPanelShowsTitle(title)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator('article.cmp-detail-page')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(this.title)
  }
}

export class DetailPanelShowsSource implements Answerable {
  static now(): DetailPanelShowsSource {
    return new DetailPanelShowsSource()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator('article.cmp-detail-page')
    const links = detail.locator('.cmp-detail-page-links')
    await expect(links).toBeVisible()
  }
}

export class DetailPanelShowsTags implements Answerable {
  static now(): DetailPanelShowsTags {
    return new DetailPanelShowsTags()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator('article.cmp-detail-page')
    const tags = detail.locator('.cmp-detail-page-tags')
    await expect(tags).toBeVisible()
  }
}

export class DetailPanelShowsNotes implements Answerable {
  static now(): DetailPanelShowsNotes {
    return new DetailPanelShowsNotes()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const detail = actor.page.locator('article.cmp-detail-page')
    const body = detail.locator('.cmp-detail-page-body')
    await expect(body).toBeVisible()
  }
}

export class DetailPanelMatchesSelectedEntry implements Answerable {
  static now(): DetailPanelMatchesSelectedEntry {
    return new DetailPanelMatchesSelectedEntry()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const title = actor.recall<string>('selectedEntryTitle')
    const detail = actor.page.locator('article.cmp-detail-page')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(title)
  }
}

export class DetailPanelIsHidden implements Answerable {
  static now(): DetailPanelIsHidden {
    return new DetailPanelIsHidden()
  }

  async answeredBy(actor: Actor): Promise<void> {
    await expect(actor.page.locator('article.cmp-detail-page')).toHaveCount(0)
  }
}
