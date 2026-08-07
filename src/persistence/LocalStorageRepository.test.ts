import { describe, expect, it, vi } from 'vitest'
import { LocalStorageRepository } from './LocalStorageRepository'
import { createMemoryStore } from './testHelpers'

interface Widget {
  readonly id: string
  readonly label: string
}

function makeRepo(store = createMemoryStore()) {
  return { store, repo: new LocalStorageRepository<Widget, string>(store, 'widgets', (w) => w.id) }
}

describe('LocalStorageRepository', () => {
  it('returns an empty array when nothing has been stored yet', () => {
    const { repo } = makeRepo()
    expect(repo.getAll()).toEqual([])
  })

  it('saves and retrieves an entity by id', () => {
    const { repo } = makeRepo()
    repo.save({ id: 'a', label: 'Widget A' })
    expect(repo.getById('a')).toEqual({ id: 'a', label: 'Widget A' })
    expect(repo.getById('missing')).toBeUndefined()
  })

  it('persists across repository instances backed by the same store (this is what "auto-save" means)', () => {
    const store = createMemoryStore()
    const first = new LocalStorageRepository<Widget, string>(store, 'widgets', (w) => w.id)
    first.save({ id: 'a', label: 'Widget A' })

    const second = new LocalStorageRepository<Widget, string>(store, 'widgets', (w) => w.id)
    expect(second.getById('a')).toEqual({ id: 'a', label: 'Widget A' })
  })

  it('overwrites an existing entity with the same id rather than duplicating it', () => {
    const { repo } = makeRepo()
    repo.save({ id: 'a', label: 'First' })
    repo.save({ id: 'a', label: 'Second' })
    expect(repo.getAll()).toEqual([{ id: 'a', label: 'Second' }])
  })

  it('saveMany upserts a mix of new and existing entities in one pass', () => {
    const { repo } = makeRepo()
    repo.save({ id: 'a', label: 'First' })
    repo.saveMany([
      { id: 'a', label: 'Updated' },
      { id: 'b', label: 'New' },
    ])
    expect(repo.getAll()).toEqual([
      { id: 'a', label: 'Updated' },
      { id: 'b', label: 'New' },
    ])
  })

  it('deletes an entity by id, leaving the others untouched', () => {
    const { repo } = makeRepo()
    repo.saveMany([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ])
    repo.delete('a')
    expect(repo.getAll()).toEqual([{ id: 'b', label: 'B' }])
  })

  it('deleteMany removes several entities in one pass', () => {
    const { repo } = makeRepo()
    repo.saveMany([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ])
    repo.deleteMany(['a', 'c'])
    expect(repo.getAll()).toEqual([{ id: 'b', label: 'B' }])
  })

  it('deleting a missing id is a harmless no-op', () => {
    const { repo } = makeRepo()
    repo.save({ id: 'a', label: 'A' })
    expect(() => repo.delete('missing')).not.toThrow()
    expect(repo.getAll()).toEqual([{ id: 'a', label: 'A' }])
  })

  it('clear() removes everything under this repository\'s key', () => {
    const { repo, store } = makeRepo()
    repo.saveMany([{ id: 'a', label: 'A' }])
    repo.clear()
    expect(repo.getAll()).toEqual([])
    expect(store.getItem('widgets')).toBeNull()
  })

  it('does not touch other keys in the same store', () => {
    const store = createMemoryStore()
    const widgets = new LocalStorageRepository<Widget, string>(store, 'widgets', (w) => w.id)
    const gadgets = new LocalStorageRepository<Widget, string>(store, 'gadgets', (w) => w.id)

    widgets.save({ id: 'a', label: 'Widget' })
    gadgets.save({ id: 'a', label: 'Gadget' })

    expect(widgets.getById('a')?.label).toBe('Widget')
    expect(gadgets.getById('a')?.label).toBe('Gadget')
  })

  it('treats corrupted data as empty instead of throwing, and warns once', () => {
    const store = createMemoryStore()
    store.setItem('widgets', '{ not valid json')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const repo = new LocalStorageRepository<Widget, string>(store, 'widgets', (w) => w.id)
    expect(repo.getAll()).toEqual([])
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('treats a stored non-array value as empty instead of throwing', () => {
    const store = createMemoryStore()
    store.setItem('widgets', JSON.stringify({ not: 'an array' }))
    const repo = new LocalStorageRepository<Widget, string>(store, 'widgets', (w) => w.id)
    expect(repo.getAll()).toEqual([])
  })
})
