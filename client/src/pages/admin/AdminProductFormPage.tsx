import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { Package, Upload, X } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/Button'
import { ButtonLink } from '@/components/ButtonLink'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { TextField } from '@/components/TextField'
import { uploadProductImage } from '@/features/admin/api'
import {
  useAdminProduct,
  useCreateAdminProduct,
  useUpdateAdminProduct,
} from '@/features/admin/queries'
import { PRODUCT_STATUS_LABELS, type AdminProductInput } from '@/features/admin/types'
import { useCategories } from '@/features/catalog/queries'
import type { PublicProduct, PublicProductImage } from '@/features/catalog/types'
import { ApiError } from '@/lib/api-client'

const MINOR_UNITS = 100
const STATUS_VALUES = ['draft', 'active', 'archived'] as const
const DEFAULT_CURRENCY = 'PKR'
const SELECT_CLASSES =
  'h-11 w-full rounded-md border border-line bg-surface px-3 text-body-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
const LABEL_CLASSES =
  'flex flex-col gap-2 text-caption font-medium uppercase tracking-[0.08em] text-muted'
const TEXTAREA_CLASSES =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-ink transition-colors duration-120 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper'

function toMinorUnits(value: string): number {
  return Math.round(Number(value) * MINOR_UNITS)
}

function toMajorUnits(amount: number): string {
  return (amount / MINOR_UNITS).toFixed(2)
}

function parseOptionalAmount(value: string): number | null {
  return value.trim() === '' ? null : toMinorUnits(value)
}

const productFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a product name').max(160),
    description: z
      .string()
      .trim()
      .min(10, 'Describe the product in at least 10 characters')
      .max(5000),
    brand: z.string().trim().max(80),
    price: z.string().trim(),
    compareAtPrice: z.string().trim(),
    stock: z.string().trim(),
    status: z.enum(STATUS_VALUES),
    isFeatured: z.boolean(),
    category: z.string(),
    tags: z.string(),
  })
  .refine(
    (values) =>
      values.price.trim() !== '' && Number.isFinite(Number(values.price)) && Number(values.price) >= 0,
    { path: ['price'], message: 'Enter a valid price' },
  )
  .refine(
    (values) =>
      values.stock.trim() !== '' &&
      Number.isInteger(Number(values.stock)) &&
      Number(values.stock) >= 0,
    { path: ['stock'], message: 'Enter a valid stock quantity' },
  )
  .refine(
    (values) =>
      values.compareAtPrice.trim() === '' ||
      (Number.isFinite(Number(values.compareAtPrice)) && Number(values.compareAtPrice) >= 0),
    { path: ['compareAtPrice'], message: 'Enter a valid price' },
  )

type ProductFormValues = z.infer<typeof productFormSchema>

const DEFAULT_VALUES: ProductFormValues = {
  name: '',
  description: '',
  brand: '',
  price: '',
  compareAtPrice: '',
  stock: '0',
  status: 'draft',
  isFeatured: false,
  category: '',
  tags: '',
}

function toFormValues(product: PublicProduct): ProductFormValues {
  return {
    name: product.name,
    description: product.description,
    brand: product.brand ?? '',
    price: toMajorUnits(product.price),
    compareAtPrice: product.compareAtPrice === null ? '' : toMajorUnits(product.compareAtPrice),
    stock: String(product.stock),
    status: product.status,
    isFeatured: product.isFeatured,
    category: product.category?.id ?? '',
    tags: product.tags.join(', '),
  }
}

function toInput(values: ProductFormValues, images: PublicProductImage[]): AdminProductInput {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    price: toMinorUnits(values.price),
    brand: values.brand.trim() || null,
    compareAtPrice: parseOptionalAmount(values.compareAtPrice),
    currency: DEFAULT_CURRENCY,
    category: values.category || null,
    images,
    stock: Number(values.stock),
    status: values.status,
    isFeatured: values.isFeatured,
    tags: values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  }
}

export function AdminProductFormPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const productQuery = useAdminProduct(id)
  const categoriesQuery = useCategories()
  const createMutation = useCreateAdminProduct()
  const updateMutation = useUpdateAdminProduct()

  const [images, setImages] = useState<PublicProductImage[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const product = productQuery.data

  useEffect(() => {
    if (product) {
      reset(toFormValues(product))
      setImages(product.images)
    }
  }, [product, reset])

  const categories = categoriesQuery.data ?? []
  const isSaving = isSubmitting || createMutation.isPending || updateMutation.isPending

  const handleAddImageUrl = () => {
    const value = imageUrl.trim()
    if (value === '') {
      setImageError('Enter an image URL first')
      return
    }
    let parsed: URL | null = null
    try {
      parsed = new URL(value)
    } catch {
      parsed = null
    }
    if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) {
      setImageError('Enter a valid http or https image URL')
      return
    }
    setImages((prev) => [...prev, { url: value, alt: '' }])
    setImageUrl('')
    setImageError(null)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) {
      return
    }
    setUploading(true)
    setImageError(null)
    try {
      const stored = await uploadProductImage(file)
      setImages((prev) => [...prev, { url: stored.url, alt: '' }])
    } catch (error) {
      setImageError(error instanceof ApiError ? error.message : 'Could not upload the image')
    } finally {
      setUploading(false)
    }
  }

  const updateAlt = (index: number, alt: string) => {
    setImages((prev) => prev.map((image, i) => (i === index ? { ...image, alt } : image)))
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const input = toInput(values, images)

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, input })
      } else {
        await createMutation.mutateAsync(input)
      }
      navigate('/admin/products')
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          const message = messages[0]
          if (!message) {
            continue
          }
          setError(key as Path<ProductFormValues>, { type: 'server', message })
        }
        return
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not save the product. Please try again.',
      )
    }
  })

  if (isEdit && productQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-storefront flex-col gap-6 px-6 py-10 lg:px-10">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-11 w-48 rounded-md" />
      </div>
    )
  }

  if (isEdit && productQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
        <EmptyState
          icon={<Package className="size-7" strokeWidth={1.5} />}
          title="We could not load this product"
          description="It may have been removed. Return to the product list and try again."
          action={<ButtonLink to="/admin/products">Back to products</ButtonLink>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-storefront px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-3">
        <ButtonLink to="/admin/products" variant="ghost" size="sm" className="self-start">
          Back to products
        </ButtonLink>
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-h2 text-ink">
          {isEdit ? 'Edit product' : 'New product'}
        </h1>
        <p className="max-w-[70ch] text-body-sm text-graphite">
          Prices are entered in {DEFAULT_CURRENCY} and stored with exact minor units.
        </p>
      </header>

      <form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-10">
        <section className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Name"
            containerClassName="sm:col-span-2"
            error={errors.name?.message}
            {...register('name')}
          />

          <label className={`${LABEL_CLASSES} sm:col-span-2`}>
            Description
            <textarea
              rows={5}
              placeholder="Materials, fit, and what makes it worth buying."
              className={TEXTAREA_CLASSES}
              aria-invalid={errors.description ? true : undefined}
              {...register('description')}
            />
            {errors.description ? (
              <span className="text-caption normal-case tracking-normal text-danger">
                {errors.description.message}
              </span>
            ) : null}
          </label>

          <TextField label="Brand" error={errors.brand?.message} {...register('brand')} />

          <TextField
            label={`Price (${DEFAULT_CURRENCY})`}
            inputMode="decimal"
            hint="Example: 2499.00"
            error={errors.price?.message}
            {...register('price')}
          />

          <TextField
            label="Compare at price"
            inputMode="decimal"
            hint="Optional. Shown struck through."
            error={errors.compareAtPrice?.message}
            {...register('compareAtPrice')}
          />

          <TextField
            label="Stock"
            inputMode="numeric"
            error={errors.stock?.message}
            {...register('stock')}
          />

          <label className={LABEL_CLASSES}>
            Status
            <select className={SELECT_CLASSES} {...register('status')}>
              {STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {PRODUCT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL_CLASSES}>
            Category
            <select className={SELECT_CLASSES} {...register('category')}>
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <TextField
            label="Tags"
            containerClassName="sm:col-span-2"
            hint="Comma separated, for example: linen, summer, new"
            error={errors.tags?.message}
            {...register('tags')}
          />

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 shrink-0 rounded border-line accent-brand"
              {...register('isFeatured')}
            />
            <span className="text-body-sm text-ink">Feature this product on the storefront</span>
          </label>
        </section>

        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-h4 text-ink">Images</h2>
            <p className="text-body-sm text-graphite">
              Add a hosted image URL, or upload a file. The first image is used as the thumbnail.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              label="Image URL"
              containerClassName="sm:flex-1"
              placeholder="https://cdn.example.com/product.jpg"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleAddImageUrl}>
              Add image
            </Button>
          </div>

          <label className={LABEL_CLASSES}>
            Upload from device
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              disabled={uploading}
              onChange={handleFileChange}
              className="text-body-sm text-graphite file:mr-3 file:h-9 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:text-body-sm file:font-semibold file:text-ink hover:file:bg-surface-sunken disabled:opacity-50"
            />
          </label>

          {uploading ? (
            <p className="flex items-center gap-2 text-body-sm text-muted">
              <Upload className="size-4" strokeWidth={1.5} />
              Uploading image...
            </p>
          ) : null}

          {imageError ? (
            <p role="alert" className="text-body-sm text-danger">
              {imageError}
            </p>
          ) : null}

          {images.length === 0 ? (
            <p className="rounded-md border border-line bg-surface-sunken px-4 py-3 text-body-sm text-muted">
              No images yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {images.map((image, index) => (
                <li key={`${image.url}-${index}`} className="flex items-center gap-4 px-4 py-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                    <img src={image.url} alt="" className="size-full object-cover" />
                  </div>
                  <input
                    value={image.alt}
                    onChange={(event) => updateAlt(index, event.target.value)}
                    placeholder="Alt text"
                    aria-label="Alt text"
                    className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-body-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(index)}
                    aria-label="Remove image"
                  >
                    <X className="size-4" strokeWidth={1.5} />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm text-danger"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={isSaving} className="sm:w-auto">
            {isSaving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <ButtonLink to="/admin/products" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  )
}
