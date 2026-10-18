import { useState, type FormEvent } from 'react'
import { Tags } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { TextField } from '@/components/TextField'
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '@/features/admin/queries'
import type { AdminCategoryInput } from '@/features/admin/types'
import { ApiError } from '@/lib/api-client'

export function AdminCategoriesPage() {
  const categoriesQuery = useAdminCategories()
  const createMutation = useCreateAdminCategory()
  const updateMutation = useUpdateAdminCategory()
  const deleteMutation = useDeleteAdminCategory()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setImageUrl('')
    setFormError(null)
  }

  const startEdit = (id: string, currentName: string, currentDescription: string | null, currentImageUrl: string | null) => {
    setEditingId(id)
    setName(currentName)
    setDescription(currentDescription ?? '')
    setImageUrl(currentImageUrl ?? '')
    setFormError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setFormError('Enter a category name')
      return
    }
    setFormError(null)
    const input: AdminCategoryInput = {
      name: trimmedName,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
    }
    const onError = (error: unknown) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Could not save the category',
      )
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, input }, { onSuccess: resetForm, onError })
    } else {
      createMutation.mutate(input, { onSuccess: resetForm, onError })
    }
  }

  const handleDelete = (id: string, currentName: string) => {
    if (!window.confirm(`Delete "${currentName}"? This cannot be undone.`)) {
      return
    }
    setFormError(null)
    deleteMutation.mutate(id, {
      onError: (error) => {
        setFormError(
          error instanceof ApiError ? error.message : 'Could not delete the category',
        )
      },
    })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const categories = categoriesQuery.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-h2 text-ink">Categories</h1>
        <p className="text-body-sm text-graphite">
          Group products into shoppable collections for the storefront.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-display text-h4 text-ink">
            {editingId ? 'Edit category' : 'New category'}
          </h2>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Skincare"
            />
            <label className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-ink">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Optional short description"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </label>
            <TextField
              label="Image URL"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />

            {formError ? (
              <p
                role="alert"
                className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger"
              >
                {formError}
              </p>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create category'}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-5">
          {categoriesQuery.isPending ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : categoriesQuery.isError ? (
            <EmptyState
              icon={<Tags className="size-7" strokeWidth={1.5} />}
              title="We could not load categories"
              description="Try again in a moment."
            />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={<Tags className="size-7" strokeWidth={1.5} />}
              title="No categories yet"
              description="Create your first category to start grouping products."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="truncate font-semibold text-ink">{category.name}</span>
                      <Badge tone="neutral">{category.slug}</Badge>
                    </div>
                    <span className="text-body-sm text-muted">
                      {category.description ?? 'No description'} -{' '}
                      {category.productCount ?? 0} products
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => startEdit(category.id, category.name, category.description, category.imageUrl)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(category.id, category.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
